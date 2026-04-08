-- ============================================================
-- Schema inicial — pegar en Supabase SQL Editor y ejecutar
-- ============================================================

-- Función para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── offers ────────────────────────────────────────────────
CREATE TABLE offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  product_id            TEXT,
  offer_external_id     TEXT,
  tienda_internal_id    TEXT,
  provider_product_id   TEXT,
  codigo                TEXT NOT NULL,
  nombre                TEXT,
  proveedor             TEXT NOT NULL,
  precio                NUMERIC,
  is_dead               BOOLEAN DEFAULT FALSE,
  revision              BOOLEAN DEFAULT FALSE,
  controla_existencia   BOOLEAN DEFAULT TRUE,
  status_provider       TEXT,
  has_catalog_diff      BOOLEAN DEFAULT FALSE,
  usa_catalogo          BOOLEAN DEFAULT FALSE,
  available_for_offer   BOOLEAN DEFAULT TRUE,
  temporarily_approved  BOOLEAN DEFAULT FALSE,
  store_min_kontrol     NUMERIC,
  clasificacion         TEXT CHECK (clasificacion IN ('ambient','chilled','frozen')),
  canal                 TEXT DEFAULT 'normal',
  catalog_treewupi      TEXT,
  catalog_store_treewupi TEXT,
  catalog_created_at    TEXT,
  catalog_updated_at    TEXT,
  existencia_fisica     NUMERIC DEFAULT 0,
  stock_reserva         NUMERIC DEFAULT 0,
  stock_tienda          NUMERIC DEFAULT 0,
  cantidad_reporte1     NUMERIC DEFAULT 0,
  kontrol_reporte1      NUMERIC DEFAULT 0,
  fotos                 TEXT[],
  marca                 TEXT,
  suministrador         TEXT,
  categoria_online      TEXT,
  categoria_almacen     TEXT,
  unidad_medida         TEXT
);
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── products ──────────────────────────────────────────────
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  codigo              TEXT NOT NULL UNIQUE,
  nombre              TEXT NOT NULL,
  nombre_normalizado  TEXT,
  marca               TEXT,
  suministrador       TEXT,
  categoria_online    TEXT,
  categoria_almacen   TEXT,
  unidad_medida       TEXT,
  unidad_compra       TEXT,
  peso_lb             NUMERIC,
  descripcion         TEXT,
  gtin                TEXT,
  net_content_value   TEXT,
  net_content_unit    TEXT,
  pais_origen         TEXT,
  fotos               TEXT[]
);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── suppliers ─────────────────────────────────────────────
CREATE TABLE suppliers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  name                    TEXT NOT NULL,
  code                    TEXT,
  contact_name            TEXT,
  email                   TEXT,
  phone                   TEXT,
  address                 TEXT,
  country                 TEXT,
  tax_id                  TEXT,
  default_currency        TEXT DEFAULT 'USD',
  default_exchange_rate   NUMERIC DEFAULT 1,
  default_lead_time_days  NUMERIC,
  default_min_qty         NUMERIC DEFAULT 1,
  default_pack_multiple   NUMERIC DEFAULT 1,
  payment_terms           TEXT,
  notes                   TEXT,
  is_active               BOOLEAN DEFAULT TRUE
);
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── purchase_orders ───────────────────────────────────────
CREATE TABLE purchase_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  order_number     TEXT,
  supplier_name    TEXT NOT NULL,
  offer_id         TEXT NOT NULL,
  offer_name       TEXT,
  created_by       TEXT NOT NULL,
  status           TEXT DEFAULT 'borrador' CHECK (status IN (
                     'borrador','pendiente_revision','confirmado',
                     'enviado','parcialmente_recibido','recibido','cancelado')),
  total_amount     NUMERIC DEFAULT 0,
  currency         TEXT DEFAULT 'USD',
  exchange_rate    NUMERIC DEFAULT 1,
  total_amount_base NUMERIC DEFAULT 0,
  notes            TEXT,
  confirmed_at     TIMESTAMPTZ,
  confirmed_by     TEXT,
  rejection_reason TEXT
);
CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── purchase_order_items ──────────────────────────────────
CREATE TABLE purchase_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  purchase_order_id     TEXT NOT NULL,
  offer_item_id         TEXT,
  internal_offer_id     TEXT,
  internal_product_code TEXT,
  product_name          TEXT NOT NULL,
  supplier_product_name TEXT,
  unit                  TEXT,
  unit_cost             NUMERIC,
  currency              TEXT,
  min_qty               NUMERIC,
  pack_multiple         NUMERIC,
  current_stock         NUMERIC,
  suggested_qty         NUMERIC,
  final_qty             NUMERIC NOT NULL,
  subtotal              NUMERIC,
  override_reason       TEXT,
  status                TEXT DEFAULT 'included' CHECK (status IN ('included','excluded'))
);
CREATE TRIGGER purchase_order_items_updated_at BEFORE UPDATE ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── supplier_offers ───────────────────────────────────────
CREATE TABLE supplier_offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  supplier_id       TEXT,
  supplier_name     TEXT NOT NULL,
  offer_name        TEXT NOT NULL,
  source_file_url   TEXT,
  source_file_name  TEXT,
  valid_from        DATE,
  valid_until       DATE,
  status            TEXT DEFAULT 'draft' CHECK (status IN (
                      'draft','imported','partially_matched','fully_matched',
                      'ordered','expired','archived')),
  currency          TEXT DEFAULT 'USD',
  exchange_rate     NUMERIC DEFAULT 1,
  total_rows        NUMERIC DEFAULT 0,
  valid_rows        NUMERIC DEFAULT 0,
  invalid_rows      NUMERIC DEFAULT 0,
  matched_rows      NUMERIC DEFAULT 0,
  notes             TEXT,
  imported_by       TEXT
);
CREATE TRIGGER supplier_offers_updated_at BEFORE UPDATE ON supplier_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── supplier_offer_items ──────────────────────────────────
CREATE TABLE supplier_offer_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  offer_id                TEXT NOT NULL,
  row_number              NUMERIC,
  supplier_product_code   TEXT,
  supplier_product_name   TEXT NOT NULL,
  supplier_description    TEXT,
  format                  TEXT,
  unit                    TEXT,
  offered_cost            NUMERIC,
  currency                TEXT,
  min_qty                 NUMERIC DEFAULT 1,
  pack_multiple           NUMERIC DEFAULT 1,
  availability            TEXT,
  lead_time_days          NUMERIC,
  valid_until             TEXT,
  is_valid                BOOLEAN DEFAULT TRUE,
  notes                   TEXT,
  imported_by             TEXT
);
CREATE TRIGGER supplier_offer_items_updated_at BEFORE UPDATE ON supplier_offer_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── supplier_offer_item_matches ───────────────────────────
CREATE TABLE supplier_offer_item_matches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  offer_item_id            TEXT NOT NULL,
  offer_id                 TEXT NOT NULL,
  imported_by              TEXT,
  internal_product_id      TEXT,
  internal_product_codigo  TEXT,
  internal_product_nombre  TEXT,
  match_type               TEXT,
  match_confidence         NUMERIC,
  confirmed_by             TEXT,
  confirmed_at             TIMESTAMPTZ
);
CREATE TRIGGER supplier_offer_item_matches_updated_at BEFORE UPDATE ON supplier_offer_item_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── offer_item_matches ────────────────────────────────────
CREATE TABLE offer_item_matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  offer_item_id         TEXT NOT NULL,
  offer_id              TEXT NOT NULL,
  internal_offer_id     TEXT,
  internal_product_code TEXT,
  internal_product_name TEXT,
  match_type            TEXT DEFAULT 'manual' CHECK (match_type IN ('auto_exact','auto_fuzzy','manual')),
  match_confidence      NUMERIC,
  confirmed_at          TIMESTAMPTZ,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  notes                 TEXT
);
CREATE TRIGGER offer_item_matches_updated_at BEFORE UPDATE ON offer_item_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── sales_index ───────────────────────────────────────────
CREATE TABLE sales_index (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  tienda_internal_id  TEXT NOT NULL,
  codigo              TEXT,
  nombre              TEXT,
  suministrador       TEXT,
  categoria_online    TEXT,
  total_ordenes       NUMERIC DEFAULT 0,
  total_cantidad      NUMERIC DEFAULT 0,
  costo_total         NUMERIC DEFAULT 0,
  importe_total       NUMERIC DEFAULT 0,
  ganancia_total      NUMERIC DEFAULT 0,
  periodo             TEXT,
  periodo_fecha       TEXT NOT NULL,
  imported_at         TIMESTAMPTZ
);
CREATE TRIGGER sales_index_updated_at BEFORE UPDATE ON sales_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── inventory_snapshots ───────────────────────────────────
CREATE TABLE inventory_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  offer_id          TEXT NOT NULL,
  offer_external_id TEXT,
  snapshot_at       TIMESTAMPTZ NOT NULL,
  existencia_fisica NUMERIC,
  stock_reserva     NUMERIC,
  stock_tienda      NUMERIC,
  precio            NUMERIC,
  cantidad_reporte1 NUMERIC,
  kontrol_reporte1  NUMERIC
);
CREATE TRIGGER inventory_snapshots_updated_at BEFORE UPDATE ON inventory_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── connectors ────────────────────────────────────────────
CREATE TABLE connectors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('http_endpoint','ftp','sftp','local_path')),
  report_type      TEXT NOT NULL CHECK (report_type IN ('reporte_almacen','reporte_submayor','ambos')),
  url_or_path      TEXT,
  auth_header      TEXT,
  ftp_host         TEXT,
  ftp_port         NUMERIC,
  ftp_user         TEXT,
  ftp_password     TEXT,
  ftp_remote_path  TEXT,
  schedule         TEXT DEFAULT 'manual' CHECK (schedule IN ('manual','hourly','every_6h','every_12h','daily')),
  is_active        BOOLEAN DEFAULT FALSE,
  last_run_at      TIMESTAMPTZ,
  last_run_status  TEXT CHECK (last_run_status IN ('success','error','pending','never')),
  last_run_message TEXT,
  notes            TEXT
);
CREATE TRIGGER connectors_updated_at BEFORE UPDATE ON connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── import_logs ───────────────────────────────────────────
CREATE TABLE import_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  import_type    TEXT NOT NULL CHECK (import_type IN ('reporte_almacen','reporte_submayor','ambos')),
  status         TEXT NOT NULL CHECK (status IN ('success','partial','error')),
  total_records  NUMERIC,
  processed      NUMERIC,
  errors_count   NUMERIC,
  warnings_count NUMERIC,
  details        TEXT,
  imported_by    TEXT
);
CREATE TRIGGER import_logs_updated_at BEFORE UPDATE ON import_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── replenishment_proposal_items ──────────────────────────
CREATE TABLE replenishment_proposal_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  offer_id                 TEXT NOT NULL,
  offer_item_id            TEXT,
  match_id                 TEXT,
  imported_by              TEXT,
  internal_product_id      TEXT,
  internal_product_codigo  TEXT,
  internal_product_nombre  TEXT,
  current_stock            NUMERIC,
  minimum_stock            NUMERIC,
  ideal_stock              NUMERIC,
  estimated_demand         NUMERIC DEFAULT 0,
  suggested_qty            NUMERIC,
  final_qty                NUMERIC,
  offered_cost             NUMERIC,
  selection_status         TEXT,
  purchase_order_id        TEXT,
  manual_override_reason   TEXT,
  decided_by               TEXT,
  decided_at               TIMESTAMPTZ
);
CREATE TRIGGER replenishment_proposal_items_updated_at BEFORE UPDATE ON replenishment_proposal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS: desactivado para desarrollo ──────────────────────
-- Activar y configurar políticas cuando se necesite multi-tenant
ALTER TABLE offers                       DISABLE ROW LEVEL SECURITY;
ALTER TABLE products                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders              DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_offers              DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_offer_items         DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_offer_item_matches  DISABLE ROW LEVEL SECURITY;
ALTER TABLE offer_item_matches           DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_index                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_snapshots          DISABLE ROW LEVEL SECURITY;
ALTER TABLE connectors                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE replenishment_proposal_items DISABLE ROW LEVEL SECURITY;
