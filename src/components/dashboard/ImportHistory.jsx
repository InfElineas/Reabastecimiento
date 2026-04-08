import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { History, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  success: { icon: CheckCircle, color: "text-accent", badge: "default", label: "Exitosa" },
  partial: { icon: AlertTriangle, color: "text-warning", badge: "secondary", label: "Parcial" },
  error: { icon: XCircle, color: "text-destructive", badge: "destructive", label: "Error" },
};

const typeLabel = {
  reporte_almacen: "Almacén",
  reporte_submayor: "Submayor",
  ambos: "Ambos",
};

export default function ImportHistory({ logs = [], isLoading }) {
  // Build chart data from logs (last 10)
  const chartData = [...logs]
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .slice(-10)
    .map((log) => ({
      date: log.created_date ? format(new Date(log.created_date), "dd/MM HH:mm") : "-",
      procesados: log.processed || 0,
      errores: log.errors_count || 0,
    }));

  return (
    <div className="space-y-4">
      {/* Chart */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <History size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold">Historial de Importaciones (últimas 10)</h3>
        </div>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gProcesados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gErrores" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="procesados" name="Procesados" stroke="hsl(var(--chart-1))" fill="url(#gProcesados)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="errores" name="Errores" stroke="hsl(var(--destructive))" fill="url(#gErrores)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
            Sin historial de importaciones
          </div>
        )}
      </Card>

      {/* Log table */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Últimas Importaciones</h3>
        {isLoading ? (
          <div className="space-y-2">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin registros</p>
        ) : (
          <div className="divide-y divide-border">
            {[...logs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 8).map((log) => {
              const cfg = statusConfig[log.status] || statusConfig.partial;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className={cfg.color} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {typeLabel[log.import_type] || log.import_type}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.created_date ? format(new Date(log.created_date), "dd MMM yyyy HH:mm", { locale: es }) : "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                    <span>{log.processed ?? 0}/{log.total_records ?? 0} reg.</span>
                    {log.errors_count > 0 && (
                      <span className="text-destructive">{log.errors_count} err.</span>
                    )}
                    <Badge variant={cfg.badge} className="text-[10px] px-1.5 py-0">
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}