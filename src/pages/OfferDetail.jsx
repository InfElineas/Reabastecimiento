import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Package, Tag, Warehouse, AlertTriangle, Clock,
  DollarSign, BarChart3, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus, History
} from "lucide-react";
import OfferStatusBadge from "../components/catalog/OfferStatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

function DetailRow({ label, value, highlight }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-medium text-right max-w-[60%] ${highlight ? "text-primary" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function BoolBadge({ value, trueLabel = "Sí", falseLabel = "No" }) {
  return value ? (
    <Badge className="bg-accent/10 text-accent text-[10px]"><CheckCircle size={10} className="mr-1" />{trueLabel}</Badge>
  ) : (
    <Badge className="bg-muted text-muted-foreground text-[10px]"><XCircle size={10} className="mr-1" />{falseLabel}</Badge>
  );
}

function DiffCell({ prev, curr, fmt = (v) => v, invert = false }) {
  if (prev == null) return <span className="text-muted-foreground">—</span>;
  const diff = curr - prev;
  if (diff === 0) return <span className="text-muted-foreground flex items-center gap-0.5 justify-end"><Minus size={10} /> 0</span>;
  const isPositive = invert ? diff < 0 : diff > 0;
  return (
    <span className={`flex items-center gap-0.5 justify-end font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {diff > 0 ? "+" : ""}{fmt(diff)}
    </span>
  );
}

export default function OfferDetail() {
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("id");

  const { data: offer, isLoading: loadingOffer } = useQuery({
    queryKey: ["offer", offerId],
    queryFn: () => base44.entities.Offer.filter({ id: offerId }),
    select: (data) => data[0],
    enabled: !!offerId,
  });

  const { data: product } = useQuery({
    queryKey: ["product", offer?.product_id],
    queryFn: () => base44.entities.Product.filter({ id: offer.product_id }),
    select: (data) => data[0],
    enabled: !!offer?.product_id,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ["snapshots", offerId],
    queryFn: () => base44.entities.InventorySnapshot.filter({ offer_id: offerId }, "-snapshot_at", 200),
    enabled: !!offerId,
  });

  if (loadingOffer) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Oferta no encontrada</p>
        <Link to={createPageUrl("Catalog")}>
          <Button variant="outline" className="mt-4">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const alerts = [];
  const ef = offer.existencia_fisica || 0;
  const sr = offer.stock_reserva || 0;
  const st = offer.stock_tienda || 0;
  if (ef !== sr + st) alerts.push({ text: `Inconsistencia: ${ef} ≠ ${sr} + ${st}`, severity: "critical" });
  if (offer.cantidad_reporte1 != null && offer.cantidad_reporte1 !== ef) alerts.push({ text: `Cantidad R1 (${offer.cantidad_reporte1}) ≠ Existencia (${ef})`, severity: "warning" });
  if (offer.kontrol_reporte1 != null && offer.kontrol_reporte1 !== st) alerts.push({ text: `Kontrol R1 (${offer.kontrol_reporte1}) ≠ Stock tienda (${st})`, severity: "warning" });
  if (!offer.is_dead && ef === 0) alerts.push({ text: "Oferta activa sin stock", severity: "critical" });
  if (offer.is_dead && ef > 0) alerts.push({ text: "Oferta eliminada con stock remanente", severity: "warning" });
  if (sr > 0 && st === 0) alerts.push({ text: "Reserva > 0 pero tienda = 0", severity: "warning" });
  if (offer.revision) alerts.push({ text: "Revisión pendiente", severity: "info" });
  if (offer.has_catalog_diff) alerts.push({ text: "Diferencia de catálogo detectada", severity: "info" });

  const chartData = [...snapshots].reverse().map((s) => ({
    date: s.snapshot_at ? format(new Date(s.snapshot_at), "dd/MM HH:mm") : "",
    existencia: s.existencia_fisica || 0,
    reserva: s.stock_reserva || 0,
    tienda: s.stock_tienda || 0,
    precio: s.precio || 0,
  }));

  // Audit: build changelog from consecutive snapshots (newest first)
  const auditRows = snapshots.map((s, idx) => {
    const prev = snapshots[idx + 1]; // older
    const changes = [];
    if (prev) {
      if ((s.precio || 0) !== (prev.precio || 0)) changes.push({ field: "Precio", prev: prev.precio, curr: s.precio, type: "precio" });
      if ((s.existencia_fisica || 0) !== (prev.existencia_fisica || 0)) changes.push({ field: "Existencia", prev: prev.existencia_fisica, curr: s.existencia_fisica, type: "stock" });
      if ((s.stock_reserva || 0) !== (prev.stock_reserva || 0)) changes.push({ field: "Reserva", prev: prev.stock_reserva, curr: s.stock_reserva, type: "stock" });
      if ((s.stock_tienda || 0) !== (prev.stock_tienda || 0)) changes.push({ field: "Tienda", prev: prev.stock_tienda, curr: s.stock_tienda, type: "stock" });
    }
    return { snapshot: s, prev, changes };
  });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={createPageUrl("Catalog")}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft size={16} />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold truncate">{offer.nombre}</h1>
            <OfferStatusBadge offer={offer} />
          </div>
          <p className="text-xs text-muted-foreground">
            Código: {offer.codigo} · Oferta: {offer.offer_external_id || "—"}
          </p>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <Badge key={i} className={`text-xs ${
              a.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/20" :
              a.severity === "warning" ? "bg-warning/10 text-warning border-warning/20" :
              "bg-info/10 text-info border-info/20"
            }`}>
              <AlertTriangle size={10} className="mr-1" /> {a.text}
            </Badge>
          ))}
        </div>
      )}

      {/* Photos */}
      {offer.fotos?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {offer.fotos.map((url, i) => (
            <img key={i} src={url} alt={`Foto ${i + 1}`}
              className="h-24 w-24 rounded-lg object-cover flex-shrink-0 border border-border" />
          ))}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info" className="gap-1.5"><Package size={13} /> Info</TabsTrigger>
          <TabsTrigger value="graficos" className="gap-1.5"><BarChart3 size={13} /> Gráficos</TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-1.5">
            <History size={13} /> Auditoría
            {snapshots.length > 0 && (
              <span className="ml-1 bg-primary/15 text-primary text-[10px] px-1.5 rounded-full font-semibold">
                {snapshots.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── INFO ── */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} className="text-primary" />
                <h3 className="text-sm font-semibold">Producto</h3>
              </div>
              <DetailRow label="Código" value={offer.codigo} highlight />
              <DetailRow label="Nombre" value={product?.nombre || offer.nombre} />
              <DetailRow label="Marca" value={offer.marca} />
              <DetailRow label="Suministrador" value={offer.suministrador} />
              <DetailRow label="Cat. Online" value={offer.categoria_online} />
              <DetailRow label="Cat. Almacén" value={offer.categoria_almacen} />
              <DetailRow label="Unidad Medida" value={offer.unidad_medida} />
              <DetailRow label="GTIN" value={product?.gtin} />
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag size={14} className="text-primary" />
                <h3 className="text-sm font-semibold">Oferta</h3>
              </div>
              <DetailRow label="ID Externo" value={offer.offer_external_id} highlight />
              <DetailRow label="Tienda Internal" value={offer.tienda_internal_id} />
              <DetailRow label="Provider ID" value={offer.provider_product_id} />
              <DetailRow label="Proveedor" value={offer.proveedor} />
              <DetailRow label="Precio" value={`$${offer.precio?.toFixed(2) || "0.00"}`} />
              <DetailRow label="Clasificación" value={offer.clasificacion} />
              <DetailRow label="Canal" value={offer.canal} />
              <DetailRow label="Min Kontrol" value={offer.store_min_kontrol} />
              <div className="flex flex-wrap gap-1.5 mt-3">
                <BoolBadge value={offer.is_dead} trueLabel="Dead" falseLabel="Viva" />
                <BoolBadge value={offer.revision} trueLabel="En revisión" falseLabel="Sin revisión" />
                <BoolBadge value={offer.usa_catalogo} trueLabel="Catálogo" falseLabel="Sin catálogo" />
                <BoolBadge value={offer.has_catalog_diff} trueLabel="Diff" falseLabel="Sin diff" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse size={14} className="text-primary" />
                <h3 className="text-sm font-semibold">Inventario</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{ef}</p>
                  <p className="text-[10px] text-muted-foreground">Existencia</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{sr}</p>
                  <p className="text-[10px] text-muted-foreground">Reserva</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-lg font-bold">{st}</p>
                  <p className="text-[10px] text-muted-foreground">Tienda</p>
                </div>
              </div>
              <DetailRow label="Cantidad R1" value={offer.cantidad_reporte1} />
              <DetailRow label="Kontrol R1" value={offer.kontrol_reporte1} />
              <DetailRow label="Controla existencia" value={offer.controla_existencia ? "Sí" : "No"} />
              {ef !== sr + st && (
                <div className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs text-destructive">
                  ⚠️ Inconsistencia: {ef} ≠ {sr} + {st} = {sr + st}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── GRÁFICOS ── */}
        <TabsContent value="graficos" className="mt-4">
          {chartData.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Sin datos de historial disponibles.
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 size={14} className="text-primary" /> Evolución Stock
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="existencia" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="reserva" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="tienda" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign size={14} className="text-primary" /> Evolución Precio
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="precio" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ── AUDITORÍA ── */}
        <TabsContent value="auditoria" className="mt-4">
          {snapshots.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              <History size={24} className="mx-auto mb-2 opacity-30" />
              No hay snapshots de auditoría. Se generan automáticamente al importar el reporte de submayor.
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total snapshots", value: snapshots.length },
                  { label: "Primer registro", value: format(new Date(snapshots[snapshots.length - 1].snapshot_at), "dd/MM/yyyy") },
                  { label: "Último registro", value: format(new Date(snapshots[0].snapshot_at), "dd/MM/yyyy HH:mm") },
                  { label: "Precio actual", value: `$${(snapshots[0]?.precio || 0).toFixed(2)}` },
                ].map((stat) => (
                  <Card key={stat.label} className="p-3 text-center">
                    <p className="text-base font-bold">{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </Card>
                ))}
              </div>

              {/* Audit table */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-primary" /> Registro detallado de cambios
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 text-left font-semibold">Fecha importación</th>
                        <th className="py-2 text-right font-semibold">Existencia</th>
                        <th className="py-2 text-right font-semibold">Δ Exist.</th>
                        <th className="py-2 text-right font-semibold">Reserva</th>
                        <th className="py-2 text-right font-semibold">Δ Reserva</th>
                        <th className="py-2 text-right font-semibold">Tienda</th>
                        <th className="py-2 text-right font-semibold">Δ Tienda</th>
                        <th className="py-2 text-right font-semibold">Precio</th>
                        <th className="py-2 text-right font-semibold">Δ Precio</th>
                        <th className="py-2 text-center font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map(({ snapshot: s, prev, changes }) => {
                        const ok = (s.existencia_fisica || 0) === (s.stock_reserva || 0) + (s.stock_tienda || 0);
                        const hasChanges = changes.length > 0;
                        return (
                          <tr key={s.id} className={`border-b border-border/50 hover:bg-muted/30 ${hasChanges ? "bg-primary/2" : ""}`}>
                            <td className="py-2 font-mono">
                              {s.snapshot_at ? format(new Date(s.snapshot_at), "dd/MM/yyyy HH:mm") : "—"}
                              {hasChanges && (
                                <span className="ml-1.5 inline-flex items-center gap-0.5 bg-primary/10 text-primary px-1 rounded text-[9px]">
                                  {changes.length} cambio{changes.length > 1 ? "s" : ""}
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-right font-medium">{s.existencia_fisica ?? "—"}</td>
                            <td className="py-2 text-right">
                              <DiffCell prev={prev?.existencia_fisica} curr={s.existencia_fisica} />
                            </td>
                            <td className="py-2 text-right">{s.stock_reserva ?? "—"}</td>
                            <td className="py-2 text-right">
                              <DiffCell prev={prev?.stock_reserva} curr={s.stock_reserva} />
                            </td>
                            <td className="py-2 text-right">{s.stock_tienda ?? "—"}</td>
                            <td className="py-2 text-right">
                              <DiffCell prev={prev?.stock_tienda} curr={s.stock_tienda} />
                            </td>
                            <td className="py-2 text-right">${(s.precio || 0).toFixed(2)}</td>
                            <td className="py-2 text-right">
                              <DiffCell prev={prev?.precio} curr={s.precio} fmt={(v) => `$${Math.abs(v).toFixed(2)}`} />
                            </td>
                            <td className="py-2 text-center">
                              {ok ? (
                                <CheckCircle size={12} className="inline text-success" />
                              ) : (
                                <AlertTriangle size={12} className="inline text-destructive" title={`${s.existencia_fisica} ≠ ${s.stock_reserva} + ${s.stock_tienda}`} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}