import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { fetchExternalTable } from "@/api/externalSupabaseClient";
import { processUnified, withRetry } from "@/utils/processInventory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Loader2 } from "lucide-react";
import ImportProcessor from "../components/import/ImportProcessor";
import { format, formatDistanceToNow, addHours } from "date-fns";
import { es } from "date-fns/locale";

const EXTERNAL_VIEW      = 'invGlobal';
const AUTO_SYNC_INTERVAL = 3 * 60 * 60 * 1000; // 3 horas en ms
const LAST_SYNC_KEY      = 'inv_last_auto_sync';

function getLastSync()   { const v = localStorage.getItem(LAST_SYNC_KEY); return v ? parseInt(v) : null; }
function setLastSync()   { localStorage.setItem(LAST_SYNC_KEY, String(Date.now())); }
function getNextSync()   { const l = getLastSync(); return l ? new Date(l + AUTO_SYNC_INTERVAL) : null; }

export default function DataImport() {
  const queryClient  = useQueryClient();
  const syncLockRef  = useRef(false); // evita ejecuciones paralelas

  const [autoStatus, setAutoStatus]   = useState("idle"); // idle | running | error
  const [autoMsg, setAutoMsg]         = useState("");
  const [nextSync, setNextSync]       = useState(getNextSync);
  const [lastSyncTs, setLastSyncTs]   = useState(getLastSync);

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["import-logs"],
    queryFn:  () => base44.entities.ImportLog.list("-created_date", 20),
  });

  const handleComplete = useCallback(() => {
    refetchLogs();
    queryClient.invalidateQueries({ queryKey: ["offers"] });
    queryClient.invalidateQueries({ queryKey: ["offers-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }, [refetchLogs, queryClient]);

  // ── Auto-sync completo (sin filtro de almacén) ─────────────
  const runAutoSync = useCallback(async () => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setAutoStatus("running");
    setAutoMsg("Descargando datos completos...");

    try {
      const data = await fetchExternalTable(
        EXTERNAL_VIEW,
        (fetched, total) =>
          setAutoMsg(
            total
              ? `Descargando... ${fetched} / ${total} registros`
              : `Descargando... ${fetched} registros`
          ),
      );

      setAutoMsg("Procesando...");
      const res = await processUnified(data, {
        onStatus:   setAutoMsg,
        onProgress: () => {},
      });

      await withRetry(() =>
        base44.entities.ImportLog.create({
          import_type:    "ambos",
          status:         res.errors.length === 0 ? "success" : "partial",
          total_records:  data.length,
          processed:      res.processed,
          errors_count:   res.errors.length,
          warnings_count: res.warnings.length,
          details:        JSON.stringify({ errors: res.errors.slice(0, 20), warnings: res.warnings.slice(0, 20) }),
        })
      );

      setLastSync();
      setLastSyncTs(Date.now());
      setNextSync(getNextSync());
      handleComplete();
      setAutoStatus("idle");
      setAutoMsg("");
    } catch (err) {
      setAutoStatus("error");
      setAutoMsg(`Error: ${err.message}`);
    } finally {
      syncLockRef.current = false;
    }
  }, [handleComplete]);

  // ── Comprueba si toca sincronizar (al montar y cada minuto) ─
  useEffect(() => {
    const check = () => {
      const last = getLastSync();
      if (!last || Date.now() - last >= AUTO_SYNC_INTERVAL) {
        runAutoSync();
      }
    };

    check(); // al montar
    const interval = setInterval(check, 60_000); // cada minuto
    return () => clearInterval(interval);
  }, [runAutoSync]);

  // ── Actualiza el countdown cada minuto ─────────────────────
  useEffect(() => {
    const t = setInterval(() => setNextSync(getNextSync()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── UI helpers ─────────────────────────────────────────────
  const statusIcons = {
    success: <CheckCircle size={14} className="text-accent" />,
    partial: <AlertTriangle size={14} className="text-warning" />,
    error:   <XCircle size={14} className="text-destructive" />,
  };
  const statusLabels = { success: "Exitosa", partial: "Parcial", error: "Error" };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[800px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Importar Datos</h1>
          <p className="text-xs text-muted-foreground">
            Sincronice el inventario desde la API externa o cargue un archivo JSON
          </p>
        </div>
      </div>

      {/* ── Banner de auto-sync ── */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {autoStatus === "running"
              ? <Loader2 size={16} className="animate-spin text-primary flex-shrink-0" />
              : autoStatus === "error"
                ? <AlertTriangle size={16} className="text-destructive flex-shrink-0" />
                : <Clock size={16} className="text-muted-foreground flex-shrink-0" />
            }
            <div>
              <p className="text-sm font-medium">
                {autoStatus === "running"
                  ? autoMsg || "Sincronizando..."
                  : autoStatus === "error"
                    ? autoMsg
                    : "Sincronización automática cada 3 horas"
                }
              </p>
              {autoStatus === "idle" && (
                <p className="text-xs text-muted-foreground">
                  {lastSyncTs
                    ? <>Última: {formatDistanceToNow(new Date(lastSyncTs), { addSuffix: true, locale: es })}</>
                    : "Nunca sincronizado"
                  }
                  {nextSync && autoStatus === "idle" && (
                    <> · Próxima: {formatDistanceToNow(nextSync, { addSuffix: true, locale: es })}</>
                  )}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoSync}
            disabled={autoStatus === "running"}
            className="flex-shrink-0"
          >
            <RefreshCw size={13} className={`mr-1.5 ${autoStatus === "running" ? "animate-spin" : ""}`} />
            Sincronizar ahora
          </Button>
        </div>
      </Card>

      {/* ── Importación manual con filtro de almacén ── */}
      <ImportProcessor onComplete={handleComplete} />

      {/* ── Instrucciones ── */}
      <Card className="p-4 bg-muted/30">
        <h3 className="text-sm font-semibold mb-2">Estructura del reporte</h3>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Cada registro del reporte debe incluir los siguientes campos:</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-1">
            <span><code className="bg-muted px-1 rounded">IdTienda</code> — ID externo de la oferta</span>
            <span><code className="bg-muted px-1 rounded">Cód. Prod.</code> — código del producto</span>
            <span><code className="bg-muted px-1 rounded">Nombre</code> — nombre</span>
            <span><code className="bg-muted px-1 rounded">Suministrador</code> — proveedor</span>
            <span><code className="bg-muted px-1 rounded">Categoría Online</code> — categoría</span>
            <span><code className="bg-muted px-1 rounded">Unid/Alt.</code> — unidad de medida</span>
            <span><code className="bg-muted px-1 rounded">Exist. física</code> — existencia total</span>
            <span><code className="bg-muted px-1 rounded">Reserva</code> — stock almacén</span>
            <span><code className="bg-muted px-1 rounded">Tienda</code> — stock tienda</span>
            <span><code className="bg-muted px-1 rounded">Precio</code> — precio de costo</span>
            <span><code className="bg-muted px-1 rounded">Estado Anuncio</code> — "Muerto" = inactivo</span>
            <span><code className="bg-muted px-1 rounded">Fotos</code> — array de URLs</span>
          </div>
        </div>
      </Card>

      {/* ── Historial ── */}
      {logs.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock size={14} className="text-primary" /> Historial de Importaciones
          </h3>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                {statusIcons[log.status]}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Reporte de Inventario</span>
                    <Badge variant="outline" className="text-[10px]">
                      {statusLabels[log.status]}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {log.processed}/{log.total_records} procesados
                    {log.errors_count > 0 && ` · ${log.errors_count} errores`}
                    {log.warnings_count > 0 && ` · ${log.warnings_count} avisos`}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {log.created_at ? format(new Date(log.created_at), "dd/MM HH:mm") : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
