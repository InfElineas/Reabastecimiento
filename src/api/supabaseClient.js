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
    /** List all records, ordered and limited */
    async list(orderBy, limit = 1000) {
      const { column, ascending } = parseOrderBy(orderBy);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending })
        .limit(limit);
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
