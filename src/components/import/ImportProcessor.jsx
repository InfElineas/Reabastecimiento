import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { fetchExternalTable, fetchExternalWarehouses } from "@/api/externalSupabaseClient";
import { processUnified, withRetry } from "@/utils/processInventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileJson, CheckCircle, XCircle,
  AlertTriangle, Loader2, RefreshCw, Warehouse,
} from "lucide-react";

const EXTERNAL_VIEW = 'invGlobal';

export default function ImportProcessor({ onComplete, highlighted = false }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult]       = useState(null);

  // Warehouse selector state
  const [loadingWh, setLoadingWh]         = useState(false);
  const [warehouses, setWarehouses]       = useState(null);   // null = not loaded yet
  const [selectedWh, setSelectedWh]       = useState(new Set());
  const [fetchingData, setFetchingData]   = useState(false);

  // ── Paso 1: cargar lista de almacenes ──────────────────────
  const handleLoadWarehouses = useCallback(async () => {
    setLoadingWh(true);
    setWarehouses(null);
    setSelectedWh(new Set());
    setResult(null);
    setPreview(null);
    setFile(null);
    setStatusMsg("");
    try {
      const list = await fetchExternalWarehouses(EXTERNAL_VIEW);
      setWarehouses(list);
      setSelectedWh(new Set(list)); // todos seleccionados por defecto
    } catch (err) {
      setStatusMsg(`Error al obtener almacenes: ${err.message}`);
    } finally {
      setLoadingWh(false);
    }
  }, []);

  const toggleWh = (wh) =>
    setSelectedWh((prev) => {
      const next = new Set(prev);
      next.has(wh) ? next.delete(wh) : next.add(wh);
      return next;
    });

  const toggleAll = () =>
    setSelectedWh((prev) =>
      prev.size === warehouses.length ? new Set() : new Set(warehouses)
    );

  // ── Paso 2: descargar datos filtrados ──────────────────────
  const handleFetchFiltered = useCallback(async () => {
    if (!selectedWh.size) return;
    setFetchingData(true);
    setResult(null);
    setPreview(null);
    setStatusMsg("Descargando datos...");
    try {
      const filter = [...selectedWh];
      const data = await fetchExternalTable(
        EXTERNAL_VIEW,
        (fetched, total) => setStatusMsg(
          total
            ? `Descargando... ${fetched} / ${total} registros`
            : `Descargando... ${fetched} registros`
        ),
        filter,
      );
      setPreview({ count: data.length, sample: data[0], data });
      setStatusMsg("");
    } catch (err) {
      setStatusMsg(`Error al descargar: ${err.message}`);
    } finally {
      setFetchingData(false);
    }
  }, [selectedWh]);

  // ── Carga desde archivo JSON ───────────────────────────────
  const handleFileSelect = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setWarehouses(null);
    setSelectedWh(new Set());
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = JSON.parse(ev.target.result);
      const arr = Array.isArray(raw) ? raw : [raw];
      setPreview({ count: arr.length, sample: arr[0], data: arr });
    };
    reader.readAsText(f);
  }, []);

  // ── Importar ───────────────────────────────────────────────
  const handleProcess = async () => {
    if (!preview?.data) return;
    setProcessing(true);
    setProgress(0);
    setResult(null);
    setStatusMsg("Iniciando...");

    const res = await processUnified(preview.data, {
      onStatus:   setStatusMsg,
      onProgress: setProgress,
    });

    await withRetry(() =>
      base44.entities.ImportLog.create({
        import_type:    "ambos",
        status:         res.errors.length === 0 ? "success" : res.errors.length < preview.data.length ? "partial" : "error",
        total_records:  preview.data.length,
        processed:      res.processed,
        errors_count:   res.errors.length,
        warnings_count: res.warnings.length,
        details:        JSON.stringify({ errors: res.errors.slice(0, 50), warnings: res.warnings.slice(0, 50) }),
      })
    );

    setStatusMsg("");
    setResult(res);
    setProcessing(false);
    if (onComplete) onComplete();
  };

  const busy = processing || loadingWh || fetchingData;

  return (
    <Card className={`p-6 space-y-4 transition-all ${highlighted ? "ring-2 ring-primary shadow-lg shadow-primary/10" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileJson size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Reporte de Inventario</h3>
          <p className="text-xs text-muted-foreground">Productos, ofertas y estado de inventario</p>
        </div>
      </div>

      {/* ── Botón inicial ── */}
      {!warehouses && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLoadWarehouses}
          disabled={busy}
        >
          {loadingWh
            ? <><Loader2 size={14} className="animate-spin mr-2" />Obteniendo almacenes...</>
            : <><RefreshCw size={14} className="mr-2" />Sincronizar desde API externa</>
          }
        </Button>
      )}

      {/* ── Selector de almacenes ── */}
      {warehouses && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Warehouse size={14} className="text-primary" />
              Selecciona los almacenes
            </span>
            <button
              onClick={toggleAll}
              className="text-xs text-primary hover:underline"
              disabled={busy}
            >
              {selectedWh.size === warehouses.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {warehouses.map((wh) => (
              <button
                key={wh}
                onClick={() => toggleWh(wh)}
                disabled={busy}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedWh.has(wh)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {wh}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleFetchFiltered}
              disabled={!selectedWh.size || busy}
            >
              {fetchingData
                ? <><Loader2 size={14} className="animate-spin mr-2" />Descargando...</>
                : <><RefreshCw size={14} className="mr-2" />Descargar {selectedWh.size} almacén{selectedWh.size !== 1 ? "es" : ""}</>
              }
            </Button>
            <Button
              variant="outline"
              onClick={() => { setWarehouses(null); setSelectedWh(new Set()); setStatusMsg(""); }}
              disabled={busy}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* ── Separador ── */}
      <div className="relative flex items-center gap-2">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">o sube un archivo</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Carga por archivo ── */}
      <div className="border-2 border-dashed border-border rounded-lg p-5 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
          id="file-unified"
          disabled={busy}
        />
        <label htmlFor="file-unified" className={busy ? "cursor-not-allowed" : "cursor-pointer"}>
          <Upload size={22} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">{file ? file.name : "Seleccionar archivo JSON"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Arrastra o haz clic para seleccionar</p>
        </label>
      </div>

      {/* ── Vista previa ── */}
      {preview && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vista previa</span>
            <Badge variant="secondary">{preview.count} registros</Badge>
          </div>
          <pre className="text-xs text-muted-foreground bg-card p-3 rounded overflow-auto max-h-[180px]">
            {JSON.stringify(preview.sample, null, 2)}
          </pre>
        </div>
      )}

      {/* ── Progreso ── */}
      {(processing || (!loadingWh && !fetchingData && statusMsg)) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="text-sm">{statusMsg || "Procesando..."}</span>
          </div>
          {processing && (
            <>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Este proceso puede tomar varios minutos.</p>
            </>
          )}
        </div>
      )}

      {/* ── Resultado ── */}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {result.errors.length === 0
              ? <CheckCircle size={16} className="text-accent" />
              : <AlertTriangle size={16} className="text-warning" />
            }
            <span className="text-sm font-medium">
              {result.processed} de {preview.count} registros procesados
            </span>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded p-3 max-h-[120px] overflow-auto">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1">
                  <XCircle size={10} className="mt-0.5 flex-shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded p-3 max-h-[120px] overflow-auto">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-warning flex items-start gap-1">
                  <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <Button onClick={handleProcess} disabled={!preview || busy} className="w-full">
        {processing
          ? <><Loader2 size={14} className="animate-spin mr-2" />Procesando...</>
          : <><Upload size={14} className="mr-2" />Importar datos</>
        }
      </Button>
    </Card>
  );
}
