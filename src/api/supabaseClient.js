import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Entity name → Supabase table name ─────────────────────
const TABLE_MAP = {
  Offer:                       'offers',
  Product:                     'products',
  Supplier:                    'suppliers',
  PurchaseOrder:               'purchase_orders',
  PurchaseOrderItem:           'purchase_order_items',
  SupplierOffer:               'supplier_offers',
  SupplierOfferItem:           'supplier_offer_items',
  SupplierOfferItemMatch:      'supplier_offer_item_matches',
  OfferItemMatch:              'offer_item_matches',
  SalesIndex:                  'sales_index',
  InventorySnapshot:           'inventory_snapshots',
  Connector:                   'connectors',
  ImportLog:                   'import_logs',
  ReplenishmentProposalItem:   'replenishment_proposal_items',
};

// ── Map base44 orderBy format to Supabase ─────────────────
// "-created_date" → { column: "created_at", ascending: false }
const COLUMN_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
  row_index:    'row_number',
};

function parseOrderBy(orderBy) {
  if (!orderBy) return { column: 'created_at', ascending: false };
  const ascending = !orderBy.startsWith('-');
  const raw = ascending ? orderBy : orderBy.slice(1);
  return { column: COLUMN_ALIASES[raw] ?? raw, ascending };
}

// ── Generic entity adapter ─────────────────────────────────
function createEntityAdapter(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);

  return {
    /** List all records, ordered and limited, with optional offset for pagination */
    async list(orderBy, limit = 1000, offset = 0) {
      const { column, ascending } = parseOrderBy(orderBy);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      return data ?? [];
    },

    /** Filter by equality conditions */
    async filter(conditions = {}, orderBy, limit = 1000) {
      const { column, ascending } = parseOrderBy(orderBy);
      let q = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(conditions)) {
        if (Array.isArray(value)) {
          q = q.in(key, value);
        } else {
          q = q.eq(key, value);
        }
      }
      q = q.order(column, { ascending }).limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    /** Insert a single record and return it */
    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    /** Update a record by id and return it */
    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    /** Delete a record by id */
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },

    /** Bulk insert and return inserted rows */
    async bulkCreate(items) {
      if (!items?.length) return [];
      const { data, error } = await supabase
        .from(table)
        .insert(items)
        .select();
      if (error) throw error;
      return data ?? [];
    },

    /**
     * Bulk upsert: inserts or updates rows based on the conflict column.
     * Use 'codigo' for products, 'id' for forcing updates on offers.
     */
    async bulkUpsert(items, conflictColumn) {
      if (!items?.length) return [];
      const { data, error } = await supabase
        .from(table)
        .upsert(items, { onConflict: conflictColumn })
        .select();
      if (error) throw error;
      return data ?? [];
    },

    /**
     * Server-side paginated filtering with text search and custom operators.
     * Returns { data: [], total: number }.
     *
     * @param {Object} conditions  - Equality conditions { column: value }
     * @param {Object} options
     *   @param {{ text: string, columns: string[] }} [options.search]  - ilike text search
     *   @param {Array<{ type, column, value }>}     [options.extraFilters]
     *   @param {string}  [options.orderBy]  - e.g. "nombre" or "-updated_at"
     *   @param {number}  [options.limit]    - default 50
     *   @param {number}  [options.offset]   - default 0
     */
    async filterPaginated(conditions = {}, options = {}) {
      const { search, extraFilters = [], orderBy, limit = 50, offset = 0 } = options;
      const { column, ascending } = parseOrderBy(orderBy);

      let q = supabase.from(table).select('*', { count: 'exact' });

      // Text search across multiple columns (OR)
      if (search?.text?.trim()) {
        const t = search.text.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
        const orExpr = (search.columns || []).map((c) => `${c}.ilike.%${t}%`).join(',');
        if (orExpr) q = q.or(orExpr);
      }

      // Equality / array conditions
      for (const [key, value] of Object.entries(conditions)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) q = q.in(key, value);
        else q = q.eq(key, value);
      }

      // Extra operators
      for (const f of extraFilters) {
        if (f.type === 'gt')  q = q.gt(f.column, f.value);
        if (f.type === 'gte') q = q.gte(f.column, f.value);
        if (f.type === 'lt')  q = q.lt(f.column, f.value);
        if (f.type === 'lte') q = q.lte(f.column, f.value);
        if (f.type === 'neq') q = q.neq(f.column, f.value);
        if (f.type === 'is')  q = q.is(f.column, f.value);
      }

      q = q.order(column, { ascending }).range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data ?? [], total: count ?? 0 };
    },

    /**
     * Returns sorted unique non-null values for a single column.
     * Used to populate filter dropdowns (proveedores, categorías, etc.)
     */
    async selectDistinct(column, limit = 60000) {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .not(column, 'is', null)
        .neq(column, '')
        .limit(limit);
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((r) => r[column]).filter(Boolean))].sort();
      return unique;
    },
  };
}

// ── Auth adapter (mirrors base44.auth API) ─────────────────
const authAdapter = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw error ?? new Error('Not authenticated');
    return {
      id: user.id,
      email: user.email,
      role: user.app_metadata?.role ?? null,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    };
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin() {
    // Handled internally by AuthContext — no external URL needed
  },
};

// ── base44-compatible client ───────────────────────────────
export const base44 = {
  auth: authAdapter,
  entities: new Proxy(
    {},
    { get: (_, entityName) => createEntityAdapter(entityName) }
  ),
};
