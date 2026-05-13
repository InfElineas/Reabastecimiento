import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, AlertCircle, Info, ExternalLink, ShieldAlert
} from "lucide-react";

const ALERT_TYPES = {
  inconsistency: { label: "Inconsistencia de inventario", icon: AlertCircle, severity: "critical" },
  active_no_stock: { label: "Oferta activa sin stock", icon: AlertTriangle, severity: "critical" },
  dead_with_stock: { label: "Oferta eliminada con stock", icon: AlertTriangle, severity: "warning" },
  reserva_no_tienda: { label: "Reserva > 0, Tienda = 0", icon: AlertTriangle, severity: "warning" },
  revision_pending: { label: "Revisión pendiente", icon: Info, severity: "info" },
  catalog_diff: { label: "Diferencia de catálogo", icon: Info, severity: "info" },
  cantidad_mismatch: { label: "Cantidad ≠ Existencia", icon: AlertTriangle, severity: "warning" },
  kontrol_mismatch: { label: "Kontrol ≠ Stock tienda", icon: AlertTriangle, severity: "warning" },
};

/** @type {Record<string, string>} */
const severityColors = {
  critical: "bg-destructive/5 border-destructive/20 text-destructive",
  warning: "bg-warning/5 border-warning/20 text-warning",
  info: "bg-info/5 border-info/20 text-info",
};

export default function Alerts() {
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers-alerts"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
  });

  const alerts = useMemo(() => {
    /** @type {Array<{type: keyof typeof ALERT_TYPES, offer: any, detail: string}>} */
    const result = [];

    offers.forEach((o) => {
      const ef = o.existencia_fisica || 0;
      const sr = o.stock_reserva || 0;
      const st = o.stock_tienda || 0;

      if (ef !== sr + st) {
        result.push({ type: "inconsistency", offer: o, detail: `${ef} ≠ ${sr} + ${st}` });
      }
      if (!o.is_dead && ef === 0) {
        result.push({ type: "active_no_stock", offer: o, detail: "Existencia = 0" });
      }
      if (o.is_dead && ef > 0) {
        result.push({ type: "dead_with_stock", offer: o, detail: `Existencia: ${ef}` });
      }
      if (sr > 0 && st === 0) {
        result.push({ type: "reserva_no_tienda", offer: o, detail: `Reserva: ${sr}` });
      }
      if (o.revision) {
        result.push({ type: "revision_pending", offer: o, detail: "Pendiente de aprobación" });
      }
      if (o.has_catalog_diff) {
        result.push({ type: "catalog_diff", offer: o, detail: "Diferencias detectadas" });
      }
      if (o.cantidad_reporte1 != null && o.cantidad_reporte1 !== ef) {
        result.push({ type: "cantidad_mismatch", offer: o, detail: `R1: ${o.cantidad_reporte1} ≠ ${ef}` });
      }
      if (o.kontrol_reporte1 != null && o.kontrol_reporte1 !== st) {
        result.push({ type: "kontrol_mismatch", offer: o, detail: `R1: ${o.kontrol_reporte1} ≠ ${st}` });
      }
    });

    return result;
  }, [offers]);

  const filtered = alerts.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterSeverity !== "all" && ALERT_TYPES[a.type]?.severity !== filterSeverity) return false;
    return true;
  });

  // Group by type for summary
  const summary = {};
  alerts.forEach((a) => {
    summary[a.type] = (summary[a.type] || 0) + 1;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
          <ShieldAlert size={18} className="text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Centro de Alertas</h1>
          <p className="text-xs text-muted-foreground">
            {alerts.length} alertas detectadas en {offers.length} ofertas
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(summary).map(([type, count]) => {
          const config = ALERT_TYPES[/** @type {keyof typeof ALERT_TYPES} */ (type)];
          if (!config) return null;
          return (
            <Badge
              key={type}
              variant="outline"
              className={`cursor-pointer ${severityColors[config.severity]} text-xs py-1 px-2`}
              onClick={() => setFilterType(type === filterType ? "all" : type)}
            >
              {config.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Tipo de alerta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(ALERT_TYPES).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="warning">Advertencia</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.map((alert, i) => {
          const config = ALERT_TYPES[alert.type];
          const Icon = config.icon;
          return (
            <Card key={i} className={`p-3 border ${severityColors[config.severity]}`}>
              <div className="flex items-center gap-3">
                <Icon size={16} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{config.label}</span>
                    <Badge variant="outline" className="text-[10px]">{config.severity}</Badge>
                  </div>
                  <p className="text-xs mt-0.5">
                    <span className="font-mono font-medium">{alert.offer.codigo}</span>
                    {" · "}{alert.offer.nombre}
                    {" · "}<span className="opacity-75">{alert.detail}</span>
                  </p>
                </div>
                <Link to={createPageUrl("OfferDetail") + `?id=${alert.offer.id}`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <ExternalLink size={12} />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No hay alertas con los filtros seleccionados</p>
          </Card>
        )}
      </div>
    </div>
  );
}