import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileJson, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import ImportProcessor from "../components/import/ImportProcessor";
import { format } from "date-fns";

export default function DataImport() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const highlightType = urlParams.get("report_type"); // e.g. "reporte_submayor" or "reporte_almacen"

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["import-logs"],
    queryFn: () => base44.entities.ImportLog.list("-created_date", 20),
  });

  const handleComplete = () => {
    refetchLogs();
    queryClient.invalidateQueries({ queryKey: ["offers"] });
    queryClient.invalidateQueries({ queryKey: ["offers-catalog"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const statusIcons = {
    success: <CheckCircle size={14} className="text-accent" />,
    partial: <AlertTriangle size={14} className="text-warning" />,
    error: <XCircle size={14} className="text-destructive" />,
  };

  const statusLabels = {
    success: "Exitosa",
    partial: "Parcial",
    error: "Error",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Importar Datos</h1>
          <p className="text-xs text-muted-foreground">
            Cargue los reportes JSON para actualizar el inventario
          </p>
        </div>
      </div>

      {/* Import Cards */}
      {highlightType && (
        <div className="bg-primary/5 border border-primary/30 rounded-lg px-4 py-3 text-sm text-primary font-medium flex items-center gap-2">
          <Upload size={14} />
          Conector: selecciona y sube el archivo JSON en el panel{" "}
          <span className="font-bold">
            {highlightType === "reporte_submayor" ? "Submayor / Inventario" : "Almacén / Oferta"}
          </span>{" "}
          y haz clic en "Importar datos".
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ImportProcessor
          type="almacen"
          onComplete={handleComplete}
          highlighted={highlightType === "reporte_almacen" || highlightType === "ambos"}
        />
        <ImportProcessor
          type="submayor"
          onComplete={handleComplete}
          highlighted={highlightType === "reporte_submayor" || highlightType === "ambos"}
        />
      </div>

      {/* Instructions */}
      <Card className="p-4 bg-muted/30">
        <h3 className="text-sm font-semibold mb-2">Instrucciones de importación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1">Reporte 1 - Almacén / Oferta</p>
            <ul className="space-y-1">
              <li>• Contiene datos comerciales y de catálogo</li>
              <li>• Crea/actualiza productos y ofertas</li>
              <li>• Campo clave: <code className="bg-muted px-1 rounded">id_online</code></li>
              <li>• Importar primero este reporte</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Reporte 2 - Submayor / Inventario</p>
            <ul className="space-y-1">
              <li>• Contiene estado operativo del inventario</li>
              <li>• Actualiza existencia, reserva y tienda</li>
              <li>• Campo clave: <code className="bg-muted px-1 rounded">idTienda</code></li>
              <li>• Genera snapshots automáticos</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Import History */}
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
                    <span className="text-xs font-medium">
                      {log.import_type === "reporte_almacen" ? "Reporte Almacén" : "Reporte Submayor"}
                    </span>
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
                  {log.created_date ? format(new Date(log.created_date), "dd/MM HH:mm") : ""}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}