import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart2, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function ComparativeAnalysis() {
  const [selectedOffer, setSelectedOffer] = useState("all");
  const [days, setDays] = useState("30");

  const { data: snapshots = [], isLoading: loadingSnaps } = useQuery({
    queryKey: ["snapshots-analysis"],
    queryFn: () => base44.entities.InventorySnapshot.list("-snapshot_at", 2000),
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ["offers-analysis"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
  });

  const isLoading = loadingSnaps || loadingOffers;

  // Filter by days
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d;
  }, [days]);

  // Build chart data
  const chartData = useMemo(() => {
    let snaps = snapshots.filter(s => s.snapshot_at && new Date(s.snapshot_at) >= cutoff);
    if (selectedOffer !== "all") {
      snaps = snaps.filter(s => s.offer_id === selectedOffer);
    }

    // Group by day
    const byDay = new Map();
    for (const s of snaps) {
      const day = s.snapshot_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { tienda: 0, reserva: 0, fisica: 0, count: 0 });
      const d = byDay.get(day);
      d.tienda += s.stock_tienda || 0;
      d.reserva += s.stock_reserva || 0;
      d.fisica += s.existencia_fisica || 0;
      d.count++;
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, vals]) => ({
        fecha: format(parseISO(day), "dd MMM", { locale: es }),
        "Stock Tienda": Math.round(vals.tienda),
        "Stock Reserva": Math.round(vals.reserva),
        "Existencia Física": Math.round(vals.fisica),
        _quiebre: vals.tienda === 0 && vals.fisica === 0,
        _sobra: vals.fisica > vals.tienda * 3,
      }));
  }, [snapshots, selectedOffer, cutoff]);

  // Summary stats
  const quiebres = chartData.filter(d => d._quiebre).length;
  const sobreinventario = chartData.filter(d => d._sobra).length;
  const avgFisica = chartData.length
    ? Math.round(chartData.reduce((a, d) => a + d["Existencia Física"], 0) / chartData.length)
    : 0;

  // Offers with data for selector
  const offersWithSnaps = useMemo(() => {
    const ids = new Set(snapshots.map(s => s.offer_id));
    return offers.filter(o => ids.has(o.id));
  }, [offers, snapshots]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Análisis Comparativo</h1>
            <p className="text-xs text-muted-foreground">
              Stock tienda vs. almacén en el tiempo
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedOffer} onValueChange={setSelectedOffer}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Todas las ofertas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ofertas</SelectItem>
              {offersWithSnaps.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {o.codigo} — {(o.nombre || "").slice(0, 30)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Snapshots analizados</p>
          <p className="text-2xl font-bold text-primary">{chartData.length}</p>
          <p className="text-[10px] text-muted-foreground">días con datos</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Promedio existencia</p>
          <p className="text-2xl font-bold">{avgFisica}</p>
          <p className="text-[10px] text-muted-foreground">unidades / día</p>
        </Card>
        <Card className="p-4 border-destructive/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingDown size={11} className="text-destructive" /> Quiebres de stock
          </p>
          <p className="text-2xl font-bold text-destructive">{quiebres}</p>
          <p className="text-[10px] text-muted-foreground">días en cero total</p>
        </Card>
        <Card className="p-4 border-warning/30">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp size={11} className="text-warning" /> Sobreinventario
          </p>
          <p className="text-2xl font-bold text-warning">{sobreinventario}</p>
          <p className="text-[10px] text-muted-foreground">días con exceso</p>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Evolución de Stock (Área Apilada)</h3>
          <div className="flex gap-2">
            {quiebres > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle size={10} className="mr-1" /> {quiebres} quiebre(s)
              </Badge>
            )}
            {sobreinventario > 0 && (
              <Badge className="bg-warning text-warning-foreground text-[10px]">
                {sobreinventario} sobreinventario(s)
              </Badge>
            )}
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={380}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTienda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorReserva" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFisica" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Stock Tienda"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="url(#colorTienda)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Stock Reserva"
                stackId="1"
                stroke="hsl(var(--chart-2))"
                fill="url(#colorReserva)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Existencia Física"
                stackId="2"
                stroke="hsl(var(--chart-3))"
                fill="url(#colorFisica)"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[380px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 size={32} className="opacity-30" />
            <p className="text-sm">No hay datos de snapshots para el período seleccionado</p>
            <p className="text-xs">Importa reportes Submayor para generar historial</p>
          </div>
        )}
      </Card>

      {/* Legend info */}
      <Card className="p-4 bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground mb-1">📦 Stock Tienda</p>
            <p>Unidades disponibles físicamente en tienda para venta inmediata.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">🔒 Stock Reserva</p>
            <p>Unidades reservadas / en almacén pendiente de traslado a tienda.</p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-1">📊 Existencia Física</p>
            <p>Total registrado en el sistema. Idealmente debería ser = Tienda + Reserva.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}