import { base44 } from "@/api/base44Client";

const BULK_SIZE = 50;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const withRetry = async (fn, maxRetries = 5) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit =
        err?.message?.toLowerCase().includes("rate limit") ||
        err?.status === 429 ||
        err?.statusCode === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        await sleep(Math.min(1000 * Math.pow(2, attempt), 16000));
      } else {
        throw err;
      }
    }
  }
};

/**
 * Carga todos los registros de una entidad en un Map por `field`.
 * Pagina de 1000 en 1000 sin delays artificiales.
 */
const loadAllExisting = async (entity, field, onStatus) => {
  const PAGE = 1000;
  let skip = 0;
  const map = new Map();
  while (true) {
    const page = await withRetry(() => entity.list("-created_date", PAGE, skip));
    if (!page?.length) break;
    for (const rec of page) {
      if (rec[field] != null) map.set(String(rec[field]), rec);
    }
    if (page.length < PAGE) break;
    skip += PAGE;
    if (onStatus) onStatus(`Cargando ofertas existentes... ${map.size}`);
  }
  return map;
};

export function mapRecord(r) {
  return {
    codigo:           String(r["Cód. Prod."] ?? "").trim(),
    idTienda:         String(r["IdTienda"] ?? "").trim(),
    nombre:           r["Nombre"] ?? "",
    suministrador:    r["Suministrador"] ?? "",
    categoriaOnline:  (r["Categoría Online"] ?? "").trim(),
    unidadMedida:     r["Unid/Alt."] ?? "",
    existenciaFisica: Number(r["Exist. física"] ?? 0),
    stockReserva:     Number(r["Reserva"] ?? 0),
    stockTienda:      Number(r["Tienda"] ?? 0),
    precio:           Number(r["Precio"] ?? 0),
    isDead:           r["Estado Anuncio"] === "Muerto",
    fotos:            Array.isArray(r["Fotos"]) ? r["Fotos"].filter(Boolean) : [],
  };
}

/**
 * Procesa registros del reporte unificado y hace upsert en Supabase.
 *
 * Estrategia optimizada:
 *  1. Deduplica por código (evita duplicate key dentro del mismo batch)
 *  2. Upsert masivo de productos en batch (sin pre-carga, sin delays)
 *  3. Pre-carga ofertas existentes para clasificar create/update
 *  4. Bulk create de ofertas nuevas
 *  5. Bulk upsert (por id) de ofertas existentes → bulk update real
 *  6. Bulk create de todos los snapshots en una sola pasada
 *
 * @param {Array} records  - Registros crudos del API o JSON
 * @param {{ onStatus?: Function, onProgress?: Function }} callbacks
 * @returns {{ processed: number, errors: string[], warnings: string[] }}
 */
export async function processUnified(
  records,
  { onStatus = () => {}, onProgress = () => {} } = {}
) {
  const errors   = [];
  const warnings = [];
  let processed  = 0;
  const now = new Date().toISOString();

  // ── 1. Mapear y deduplicar por codigo ─────────────────────
  // Si hay dos filas con el mismo Cód. Prod., la última gana.
  onStatus("Procesando y deduplicando registros...");
  const deduped = new Map();
  for (let i = 0; i < records.length; i++) {
    const m = mapRecord(records[i]);
    if (!m.codigo) {
      errors.push(`Registro ${i + 1}: falta "Cód. Prod."`);
      continue;
    }
    deduped.set(m.codigo, m);
  }
  const unique = [...deduped.values()];
  onProgress(5);

  // ── 2. Upsert masivo de productos (conflict: codigo) ───────
  // No necesita pre-carga: upsert maneja create y update en uno.
  onStatus(`Sincronizando ${unique.length} productos...`);
  const productIdMap = new Map(); // codigo → id

  for (let i = 0; i < unique.length; i += BULK_SIZE) {
    const batch = unique.slice(i, i + BULK_SIZE);
    const payload = batch.map((m) => ({
      codigo:             m.codigo,
      nombre:             m.nombre,
      nombre_normalizado: m.nombre.toLowerCase().trim(),
      suministrador:      m.suministrador,
      categoria_online:   m.categoriaOnline,
      unidad_medida:      m.unidadMedida,
      fotos:              m.fotos,
    }));
    const upserted = await withRetry(() =>
      base44.entities.Product.bulkUpsert(payload, "codigo")
    );
    upserted.forEach((p) => productIdMap.set(p.codigo, p.id));
    onProgress(5 + Math.round(((i + batch.length) / unique.length) * 30));
    onStatus(`Productos ${Math.min(i + BULK_SIZE, unique.length)}/${unique.length}...`);
  }
  onProgress(35);

  // ── 3. Pre-cargar ofertas existentes ───────────────────────
  onStatus("Cargando ofertas existentes...");
  const offersById     = await loadAllExisting(base44.entities.Offer, "offer_external_id", onStatus);
  const offersByCodigo = await loadAllExisting(base44.entities.Offer, "codigo", onStatus);
  onProgress(50);

  // ── 4. Clasificar ofertas ──────────────────────────────────
  onStatus("Clasificando ofertas...");
  const toCreate = []; // payload sin id
  const toUpdate = []; // { payload (con id), m }

  for (const m of unique) {
    const offerPayload = {
      product_id:        productIdMap.get(m.codigo) ?? null,
      offer_external_id: m.idTienda || null,
      codigo:            m.codigo,
      nombre:            m.nombre,
      proveedor:         m.suministrador,
      suministrador:     m.suministrador,
      categoria_online:  m.categoriaOnline,
      unidad_medida:     m.unidadMedida,
      existencia_fisica: m.existenciaFisica,
      stock_reserva:     m.stockReserva,
      stock_tienda:      m.stockTienda,
      precio:            m.precio,
      is_dead:           m.isDead,
      fotos:             m.fotos,
    };

    const existing = m.idTienda
      ? offersById.get(m.idTienda)
      : offersByCodigo.get(m.codigo);

    if (existing) {
      toUpdate.push({ payload: { id: existing.id, ...offerPayload }, m });
    } else {
      toCreate.push({ payload: offerPayload, m });
    }
  }

  // Acumula { offerId, m } para luego crear snapshots
  const done = [];

  // ── 5. Bulk create de ofertas nuevas ───────────────────────
  onStatus(`Creando ${toCreate.length} ofertas nuevas...`);
  for (let i = 0; i < toCreate.length; i += BULK_SIZE) {
    const batch = toCreate.slice(i, i + BULK_SIZE);
    const created = await withRetry(() =>
      base44.entities.Offer.bulkCreate(batch.map((b) => b.payload))
    );
    created.forEach((c, idx) => done.push({ offerId: c.id, m: batch[idx].m }));
    processed += batch.length;
    onProgress(50 + Math.round(((i + batch.length) / Math.max(toCreate.length, 1)) * 15));
    onStatus(`Creando ofertas... ${Math.min(i + BULK_SIZE, toCreate.length)}/${toCreate.length}`);
  }

  // ── 6. Bulk update de ofertas existentes (upsert por id) ───
  // Upsert con onConflict:'id' actúa como UPDATE masivo en un solo batch.
  onStatus(`Actualizando ${toUpdate.length} ofertas...`);
  for (let i = 0; i < toUpdate.length; i += BULK_SIZE) {
    const batch = toUpdate.slice(i, i + BULK_SIZE);
    const payloads = batch.map((b) => b.payload);
    await withRetry(() =>
      base44.entities.Offer.bulkUpsert(payloads, "id")
    );
    batch.forEach((b) => done.push({ offerId: b.payload.id, m: b.m }));
    processed += batch.length;
    onProgress(65 + Math.round(((i + batch.length) / Math.max(toUpdate.length, 1)) * 20));
    onStatus(`Actualizando ofertas... ${Math.min(i + BULK_SIZE, toUpdate.length)}/${toUpdate.length}`);
  }

  // ── 7. Bulk create de snapshots (una sola pasada) ──────────
  onStatus(`Registrando ${done.length} snapshots...`);
  const snapshots = done.map(({ offerId, m }) => ({
    offer_id:          offerId,
    offer_external_id: m.idTienda || null,
    snapshot_at:       now,
    existencia_fisica: m.existenciaFisica,
    stock_reserva:     m.stockReserva,
    stock_tienda:      m.stockTienda,
    precio:            m.precio,
  }));

  for (let i = 0; i < snapshots.length; i += BULK_SIZE) {
    const batch = snapshots.slice(i, i + BULK_SIZE);
    await withRetry(() => base44.entities.InventorySnapshot.bulkCreate(batch));
    onProgress(85 + Math.round(((i + batch.length) / Math.max(snapshots.length, 1)) * 15));
    onStatus(`Snapshots... ${Math.min(i + BULK_SIZE, snapshots.length)}/${snapshots.length}`);
  }

  onProgress(100);
  onStatus("");
  return { processed, errors, warnings };
}
