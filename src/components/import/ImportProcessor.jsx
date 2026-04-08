import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileJson, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retry with exponential backoff on rate limit errors
const withRetry = async (fn, maxRetries = 5) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err?.message?.toLowerCase().includes("rate limit") ||
        err?.status === 429 || err?.statusCode === 429;
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 1s, 2s, 4s, 8s, 16s
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
};

// Load ALL existing records for an entity using pagination
const loadAllExisting = async (entity, field, setStatus) => {
  const PAGE = 500;
  let skip = 0;
  const map = new Map();
  while (true) {
    const page = await withRetry(() => entity.list("-created_date", PAGE, skip));
    if (!page || page.length === 0) break;
    for (const rec of page) {
      if (rec[field]) map.set(String(rec[field]), rec);
    }
    if (page.length < PAGE) break;
    skip += PAGE;
    if (setStatus) setStatus(`Cargando existentes... ${map.size} registros`);
    await sleep(200);
  }
  return map;
};

export default function ImportProcessor({ type, onComplete, highlighted = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState(null);

  const handleFileSelect = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = JSON.parse(ev.target.result);
      const arr = Array.isArray(data) ? data : [data];
      setPreview({ count: arr.length, sample: arr[0], data: arr });
    };
    reader.readAsText(f);
  }, []);

  const processAlmacen = async (records) => {
    const errors = [];
    const warnings = [];
    let processed = 0;

    // Step 1: Pre-load all existing products and offers (bulk, paginated)
    setStatusMsg("Cargando productos existentes...");
    const existingProductsMap = await loadAllExisting(base44.entities.Product, "codigo", setStatusMsg);
    setStatusMsg("Cargando ofertas existentes...");
    const existingOffersMapById = await loadAllExisting(base44.entities.Offer, "offer_external_id", setStatusMsg);
    // Secondary map by codigo for records without id_online
    const existingOffersMapByCode = await loadAllExisting(base44.entities.Offer, "codigo", setStatusMsg);
    const existingOffersMap = existingOffersMapById;

    setStatusMsg("Clasificando registros...");

    const toCreateProducts = [];
    const toUpdateProducts = [];
    const toCreateOffers = [];
    const toUpdateOffers = [];

    // Step 2: Classify all records
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const codigo = String(r.codigo || "").trim();
      const offerExtId = String(r.id_online || "").trim();

      if (!codigo) {
        errors.push(`Registro ${i}: falta codigo`);
        continue;
      }

      const productData = {
        codigo,
        nombre: r.nombre || "",
        nombre_normalizado: (r.nombre || "").toLowerCase().trim(),
        marca: r.catalogo?.brandName || r.marca || "",
        suministrador: r.suministrador || "",
        categoria_online: r.categoria_online || "",
        categoria_almacen: r.categoria_almacen || "",
        unidad_medida: r.unidad_medida || "",
        unidad_compra: r.unidad_compra || "",
        peso_lb: r.peso || 0,
        descripcion: r.catalogo?.descripcion || "",
        gtin: r.catalogo?.gtin || "",
        net_content_value: Array.isArray(r.catalogo?.netContent)
          ? String(r.catalogo.netContent[0]?.value ?? "")
          : typeof r.catalogo?.netContent === "string"
            ? r.catalogo.netContent.split(" ")?.[0] || ""
            : String(r.catalogo?.netContent ?? ""),
        net_content_unit: Array.isArray(r.catalogo?.netContent)
          ? r.catalogo.netContent[0]?.unitCode || ""
          : typeof r.catalogo?.netContent === "string"
            ? r.catalogo.netContent.split(" ")?.[1] || ""
            : "",
        fotos: (r.catalogo?.fotos || []).map(f => typeof f === "string" ? f : f?.foto).filter(Boolean),
      };

      const existingProduct = existingProductsMap.get(codigo);
      if (existingProduct) {
        toUpdateProducts.push({ id: existingProduct.id, data: productData, _codigo: codigo, _offerExtId: offerExtId, _r: r });
      } else {
        toCreateProducts.push({ data: productData, _codigo: codigo, _offerExtId: offerExtId, _r: r });
      }
    }

    // Step 3: Bulk create new products in batches of 50
    setStatusMsg(`Creando ${toCreateProducts.length} productos nuevos...`);
    const createdProductIds = new Map(); // codigo -> id

    const BULK_SIZE = 50;
    for (let i = 0; i < toCreateProducts.length; i += BULK_SIZE) {
      const batch = toCreateProducts.slice(i, i + BULK_SIZE);
      const created = await withRetry(() =>
        base44.entities.Product.bulkCreate(batch.map(b => b.data))
      );
      // bulkCreate returns array in same order
      created.forEach((c, idx) => {
        createdProductIds.set(batch[idx]._codigo, c.id);
      });
      setProgress(Math.round((i / toCreateProducts.length) * 30));
      setStatusMsg(`Creando productos nuevos... ${Math.min(i + BULK_SIZE, toCreateProducts.length)}/${toCreateProducts.length}`);
      await sleep(300);
    }

    // Step 4: Update existing products in batches (sequential with throttle)
    setStatusMsg(`Actualizando ${toUpdateProducts.length} productos...`);
    for (let i = 0; i < toUpdateProducts.length; i++) {
      const item = toUpdateProducts[i];
      await withRetry(() => base44.entities.Product.update(item.id, item.data));
      createdProductIds.set(item._codigo, item.id);
      setProgress(30 + Math.round((i / toUpdateProducts.length) * 20));
      setStatusMsg(`Actualizando productos... ${i + 1}/${toUpdateProducts.length}`);
      await sleep(1000); // Increased delay between updates
    }

    // Step 5: Classify offers now that we have all product IDs
    const allItems = [...toCreateProducts, ...toUpdateProducts];
    for (const item of allItems) {
      const productId = createdProductIds.get(item._codigo);
      if (!productId) continue;

      const r = item._r;
      const offerExtId = item._offerExtId;
      const offerData = {
        product_id: productId,
        offer_external_id: offerExtId,
        tienda_internal_id: String(r.tienda || ""),
        provider_product_id: String(r.id || ""),
        codigo: item._codigo,
        nombre: r.nombre || "",
        proveedor: r.proveedor || "",
        precio: r.precio || 0,
        is_dead: r.isDead || false,
        revision: r.revision || false,
        controla_existencia: r.controla_existencia !== false,
        status_provider: r.statusProvider != null ? String(r.statusProvider) : "",
        has_catalog_diff: r.has_catalog_diff || false,
        usa_catalogo: r.catalogo?.usaCatalogo || false,
        available_for_offer: r.catalogo?.availableForOffer !== false,
        temporarily_approved: r.catalogo?.temporarilyApproved || false,
        store_min_kontrol: r.store_min_kontrol || 0,
        clasificacion: r.clasificacion || "ambient",
        canal: r.canal || "normal",
        catalog_treewupi: r.catalogo?.treewupi != null ? String(r.catalogo.treewupi) : "",
        catalog_store_treewupi: r.catalogo?.storeTreewupi != null ? String(r.catalogo.storeTreewupi) : "",
        catalog_created_at: r.catalogo?.created || "",
        catalog_updated_at: r.catalogo?.updated || "",
        cantidad_reporte1: r.cantidad || 0,
        kontrol_reporte1: r.kontrol || 0,
        marca: r.catalogo?.brandName || r.marca || "",
        suministrador: r.suministrador || "",
        categoria_online: r.categoria_online || "",
        categoria_almacen: r.categoria_almacen || "",
        unidad_medida: r.unidad_medida || "",
        fotos: (r.catalogo?.fotos || []).map(f => typeof f === "string" ? f : f?.foto).filter(Boolean),
      };

      // Look up offer by id_online if present, otherwise by codigo
      const existingOffer = offerExtId
        ? existingOffersMap.get(offerExtId)
        : existingOffersMapByCode.get(item._codigo);
      if (existingOffer) {
        toUpdateOffers.push({ id: existingOffer.id, data: offerData });
      } else {
        toCreateOffers.push(offerData);
      }
    }

    // Step 6: Bulk create new offers
    setStatusMsg(`Creando ${toCreateOffers.length} ofertas nuevas...`);
    for (let i = 0; i < toCreateOffers.length; i += BULK_SIZE) {
      const batch = toCreateOffers.slice(i, i + BULK_SIZE);
      await withRetry(() => base44.entities.Offer.bulkCreate(batch));
      processed += batch.length;
      setProgress(50 + Math.round((i / toCreateOffers.length) * 25));
      setStatusMsg(`Creando ofertas nuevas... ${Math.min(i + BULK_SIZE, toCreateOffers.length)}/${toCreateOffers.length}`);
      await sleep(300);
    }

    // Step 7: Update existing offers
    setStatusMsg(`Actualizando ${toUpdateOffers.length} ofertas...`);
    for (let i = 0; i < toUpdateOffers.length; i++) {
      const item = toUpdateOffers[i];
      await withRetry(() => base44.entities.Offer.update(item.id, item.data));
      processed++;
      setProgress(75 + Math.round((i / toUpdateOffers.length) * 25));
      setStatusMsg(`Actualizando ofertas... ${i + 1}/${toUpdateOffers.length}`);
      await sleep(1000); // Increased delay between updates
    }

    setProgress(100);
    return { processed, errors, warnings };
  };

  const processSubmayor = async (records) => {
    const errors = [];
    const warnings = [];
    let processed = 0;

    // Pre-load all offers by offer_external_id and by codigo
    setStatusMsg("Cargando ofertas existentes...");
    const existingOffersById = await loadAllExisting(base44.entities.Offer, "offer_external_id", setStatusMsg);
    const existingOffersByCodigo = await loadAllExisting(base44.entities.Offer, "codigo", setStatusMsg);

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      setProgress(Math.round(((i + 1) / records.length) * 90));

      const offerExtId = String(r.idTienda || "").trim();
      const codigo = String(r.codigo || "").trim();

      // Look up by idTienda first, then fall back to codigo
      let offer = offerExtId ? existingOffersById.get(offerExtId) : null;
      if (!offer && codigo) offer = existingOffersByCodigo.get(codigo);

      if (!offer) {
        const key = offerExtId || codigo || `registro ${i}`;
        warnings.push(`Oferta ${key} no encontrada en sistema`);
        continue;
      }

      const stockReserva = r.almacen || 0;
      const stockTienda = r.tienda || 0;
      const existenciaFisica = r.existencia_fisica || 0;

      await withRetry(() => base44.entities.Offer.update(offer.id, {
        existencia_fisica: existenciaFisica,
        stock_reserva: stockReserva,
        stock_tienda: stockTienda,
        precio: r.precio || offer.precio,
      }));

      await withRetry(() => base44.entities.InventorySnapshot.create({
        offer_id: offer.id,
        offer_external_id: offerExtId,
        snapshot_at: new Date().toISOString(),
        existencia_fisica: existenciaFisica,
        stock_reserva: stockReserva,
        stock_tienda: stockTienda,
        precio: r.precio || offer.precio,
        cantidad_reporte1: offer.cantidad_reporte1 || 0,
        kontrol_reporte1: offer.kontrol_reporte1 || 0,
      }));

      if (existenciaFisica !== stockReserva + stockTienda) {
        warnings.push(`Oferta ${offerExtId}: inconsistencia inventario (${existenciaFisica} ≠ ${stockReserva} + ${stockTienda})`);
      }

      processed++;
      setStatusMsg(`Procesando inventario... ${i + 1}/${records.length}`);
      await sleep(1200); // Increased delay for submayor (2 API calls per record)
    }

    setProgress(100);
    return { processed, errors, warnings };
  };

  const handleProcess = async () => {
    if (!preview?.data) return;
    setProcessing(true);
    setProgress(0);
    setResult(null);
    setStatusMsg("Iniciando...");

    const res = type === "almacen"
      ? await processAlmacen(preview.data)
      : await processSubmayor(preview.data);

    await withRetry(() => base44.entities.ImportLog.create({
      import_type: type === "almacen" ? "reporte_almacen" : "reporte_submayor",
      status: res.errors.length === 0 ? "success" : res.errors.length < preview.data.length ? "partial" : "error",
      total_records: preview.data.length,
      processed: res.processed,
      errors_count: res.errors.length,
      warnings_count: res.warnings.length,
      details: JSON.stringify({ errors: res.errors.slice(0, 50), warnings: res.warnings.slice(0, 50) }),
    }));

    setStatusMsg("");
    setResult(res);
    setProcessing(false);
    if (onComplete) onComplete();
  };

  return (
    <Card className={`p-6 space-y-4 transition-all ${highlighted ? "ring-2 ring-primary shadow-lg shadow-primary/10" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileJson size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">
            {type === "almacen" ? "Reporte de Almacén / Oferta" : "Reporte de Submayor / Inventario"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {type === "almacen" ? "Fuente 1: datos comerciales y de oferta" : "Fuente 2: estado operativo del inventario"}
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          id={`file-${type}`}
        />
        <label htmlFor={`file-${type}`} className="cursor-pointer">
          <Upload size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {file ? file.name : "Seleccionar archivo JSON"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Arrastra o haz clic para seleccionar
          </p>
        </label>
      </div>

      {preview && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vista previa</span>
            <Badge variant="secondary">{preview.count} registros</Badge>
          </div>
          <pre className="text-xs text-muted-foreground bg-card p-3 rounded overflow-auto max-h-[200px]">
            {JSON.stringify(preview.sample, null, 2)}
          </pre>
        </div>
      )}

      {processing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="text-sm">{statusMsg || "Procesando..."}</span>
          </div>
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Este proceso puede tomar varios minutos para archivos grandes.</p>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {result.errors.length === 0 ? (
              <CheckCircle size={16} className="text-accent" />
            ) : (
              <AlertTriangle size={16} className="text-warning" />
            )}
            <span className="text-sm font-medium">
              {result.processed} de {preview.count} registros procesados
            </span>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded p-3 max-h-[150px] overflow-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1">
                  <XCircle size={10} className="mt-0.5 flex-shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded p-3 max-h-[150px] overflow-auto">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning flex items-start gap-1">
                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleProcess}
        disabled={!preview || processing}
        className="w-full"
      >
        {processing ? (
          <><Loader2 size={14} className="animate-spin mr-2" /> Procesando...</>
        ) : (
          <><Upload size={14} className="mr-2" /> Importar datos</>
        )}
      </Button>
    </Card>
  );
}