import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function History() {
  const [search, setSearch] = useState("");
  const [selectedOffer, setSelectedOffer] = useState(null);

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ["offers-history"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
  });

  const { data: snapshots = [], isLoading: loadingSnapshots } = useQuery({
    queryKey: ["snapshots", selectedOffer?.id],
    queryFn: () => base44.entities.InventorySnapshot.filter(
      { offer_id: selectedOffer.id },
      "-snapshot_at",
      100
    ),
    enabled: !!selectedOffer,
  });

  const filteredOffers = offers.filter((o) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (o.codigo || "").toLowerCase().includes(s) ||
      (o.nombre || "").toLowerCase().includes(s) ||
      (o.offer_external_id || "").toLowerCase().includes(s)
    );
  });

  const chartData = snapshots.map((s) => ({
    date: s.snapshot_at ? format(new Date(s.snapshot_at), "dd/MM HH:mm") : "",
    existencia: s.existencia_fisica || 0,
    reserva: s.stock_reserva || 0,
    tienda: s.stock_tienda || 0,
    precio: s.precio || 0,
  })).reverse();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Historial de Inventario</h1>
          <p className="text-xs text-muted-foreground">
            Evolución histórica del stock y precios por oferta
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Offer selector */}
        <Card className="p-4 lg:col-span-1">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar oferta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {loadingOffers ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 mb-1" />)
            ) : (
              filteredOffers.slice(0, 50).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOffer(o)}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors text-xs ${
                    selectedOffer?.id === o.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{o.codigo}</span>
                    <Badge variant="outline" className="text-[10px]">{o.offer_external_id}</Badge>
                  </div>
                  <p className="text-muted-foreground truncate mt-0.5">{o.nombre}</p>
                </button>
              ))
            )}
            {filteredOffers.length === 0 && !loadingOffers && (
              <p className="text-xs text-muted-foreground text-center py-4">No se encontraron ofertas</p>
            )}
          </div>
        </Card>

        {/* Charts & History */}
        <div className="lg:col-span-2 space-y-4">
          {selectedOffer ? (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">{selectedOffer.nombre}</h3>
                  <Badge variant="outline" className="text-xs">{selectedOffer.codigo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Oferta: {selectedOffer.offer_external_id} · {snapshots.length} snapshots
                </p>

                {chartData.length > 1 ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <BarChart3 size={12} /> Evolución de Stock
                      </h4>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line name="Existencia" type="monotone" dataKey="existencia" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                          <Line name="Reserva" type="monotone" dataKey="reserva" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={{ r: 2 }} />
                          <Line name="Tienda" type="monotone" dataKey="tienda" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <TrendingUp size={12} /> Evolución de Precio
                      </h4>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line name="Precio" type="monotone" dataKey="precio" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : chartData.length === 1 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Solo hay 1 snapshot. Se necesitan al menos 2 para mostrar gráficos.
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {loadingSnapshots ? "Cargando..." : "No hay snapshots para esta oferta"}
                  </div>
                )}
              </Card>

              {/* Snapshot Table */}
              {snapshots.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Detalle de Snapshots</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-2 text-left">Fecha</th>
                          <th className="py-2 text-right">Existencia</th>
                          <th className="py-2 text-right">Reserva</th>
                          <th className="py-2 text-right">Tienda</th>
                          <th className="py-2 text-right">Precio</th>
                          <th className="py-2 text-right">Cantidad R1</th>
                          <th className="py-2 text-right">Kontrol R1</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.map((s) => (
                          <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2">{s.snapshot_at ? format(new Date(s.snapshot_at), "dd/MM/yyyy HH:mm") : "—"}</td>
                            <td className="py-2 text-right font-medium">{s.existencia_fisica}</td>
                            <td className="py-2 text-right">{s.stock_reserva}</td>
                            <td className="py-2 text-right">{s.stock_tienda}</td>
                            <td className="py-2 text-right">${s.precio?.toFixed(2)}</td>
                            <td className="py-2 text-right">{s.cantidad_reporte1 ?? "—"}</td>
                            <td className="py-2 text-right">{s.kontrol_reporte1 ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-12 text-center">
              <Clock size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Seleccione una oferta para ver su historial
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}