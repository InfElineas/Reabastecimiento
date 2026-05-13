import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TrendingUp, Search, Info } from "lucide-react";

// ABC classification within category
function classifyABC(products) {
  const byCat = {};
  for (const p of products) {
    const cat = p.categoria_online || "Sin categoría";
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(p);
  }
  const result = {};
  for (const [, items] of Object.entries(byCat)) {
    const sorted = [...items].sort((a, b) => b.avg_monthly - a.avg_monthly);
    const n = sorted.length;
    sorted.forEach((item, i) => {
      const rank = i / n;
      result[item.tienda_internal_id] = {
        abc: rank < 0.2 ? "A" : rank < 0.5 ? "B" : "C",
        rankInCat: i + 1,
        totalInCat: n,
      };
    });
  }
  return result;
}

export default function SalesRanking() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const { data: salesRaw = [], isLoading } = useQuery({
    queryKey: ["sales-index"],
    queryFn: () => base44.entities.SalesIndex.list("-periodo_fecha", 5000),
  });

  const { data: offers = [] } = useQuery({
    queryKey: ["offers-all-ranking"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 2000),
  });

  const offerByTienda = useMemo(() => {
    const m = {};
    for (const o of offers) {
      if (o.tienda_internal_id) m[o.tienda_internal_id] = o;
    }
    return m;
  }, [offers]);

  // Aggregate across periods
  const products = useMemo(() => {
    const map = {};
    for (const s of salesRaw) {
      const id = s.tienda_internal_id;
      if (!map[id]) {
        map[id] = {
          tienda_internal_id: id,
          nombre: s.nombre,
          categoria_online: s.categoria_online,
          suministrador: s.suministrador,
          total_cantidad: 0,
          total_ordenes: 0,
          total_importe: 0,
          periods: new Set(),
        };
      }
      map[id].total_cantidad += s.total_cantidad || 0;
      map[id].total_ordenes += s.total_ordenes || 0;
      map[id].total_importe += s.importe_total || 0;
      map[id].periods.add(s.periodo_fecha);
    }
    return Object.values(map).map(p => ({
      ...p,
      num_periods: p.periods.size,
      avg_monthly: p.periods.size > 0 ? Math.round((p.total_cantidad / p.periods.size) * 10) / 10 : 0,
    }));
  }, [salesRaw]);

  const abcMap = useMemo(() => classifyABC(products), [products]);

  const categories = useMemo(() => {
    const s = new Set(products.map(p => p.categoria_online).filter(Boolean));
    return Array.from(s).sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (catFilter) list = list.filter(p => p.categoria_online === catFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.nombre?.toLowerCase().includes(q) || p.tienda_internal_id?.includes(q));
    }
    return list.sort((a, b) => b.avg_monthly - a.avg_monthly);
  }, [products, catFilter, search]);

  const periods = useMemo(() => {
    const s = new Set(salesRaw.map(r => r.periodo_fecha));
    return Array.from(s).sort();
  }, [salesRaw]);

  if (isLoading) return <div className="p-6 text-muted-foreground text-sm">Cargando índices...</div>;

  if (salesRaw.length === 0) {
    return (
      <div className="p-6 text-center space-y-2">
        <Info size={32} className="mx-auto text-muted-foreground opacity-40" />
        <p className="text-muted-foreground text-sm">No hay índices de ventas importados.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="text-primary" size={22} />
            Ranking de Ventas por Categoría
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {products.length} productos · {periods.length} períodos históricos ({periods[0]} → {periods[periods.length - 1]})
            · Clasificación ABC <strong>dentro de cada categoría</strong>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-52"
            />
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="h-8 text-xs border border-input rounded-md px-2 bg-background"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5"><Badge variant="default" className="text-[10px]">A</Badge> Top 20% de ventas en su categoría</div>
        <div className="flex items-center gap-1.5"><Badge variant="secondary" className="text-[10px]">B</Badge> 20%–50%</div>
        <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px]">C</Badge> Resto</div>
        <span className="text-muted-foreground">· Venta/mes = promedio mensual acumulado por período</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-10">#</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-10">Clase</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Categoría</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Venta/mes</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total uds.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Órdenes</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stock actual</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stock mín.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stock máx.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Sugerido comprar</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Rank en cat.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const abc = abcMap[p.tienda_internal_id];
              const offer = offerByTienda[p.tienda_internal_id];
              const currentStock = offer ? (offer.existencia_fisica || 0) + (offer.stock_reserva || 0) : null;
              const stockMin = Math.ceil(p.avg_monthly * 1.5);
              const stockMax = Math.ceil(p.avg_monthly * 3);
              const suggestedQty = currentStock !== null ? Math.max(0, stockMax - currentStock) : null;
              const isCritical = currentStock !== null && currentStock < stockMin;

              return (
                <tr
                  key={p.tienda_internal_id}
                  className={`border-b border-border/50 last:border-0 hover:bg-muted/30 ${isCritical ? "bg-destructive/5" : ""}`}
                >
                  <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge
                      variant={abc?.abc === "A" ? "default" : abc?.abc === "B" ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {abc?.abc || "—"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <p className="font-medium truncate">{p.nombre || "—"}</p>
                    <p className="text-muted-foreground text-[10px]">{p.tienda_internal_id} · {p.suministrador}</p>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">{p.categoria_online}</td>
                  <td className="px-3 py-2 text-right font-bold text-primary">{p.avg_monthly}</td>
                  <td className="px-3 py-2 text-right">{p.total_cantidad}</td>
                  <td className="px-3 py-2 text-right">{p.total_ordenes}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${isCritical ? "text-destructive" : ""}`}>
                    {currentStock !== null ? currentStock : <span className="text-muted-foreground text-[10px]">sin cruce</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{stockMin}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{stockMax}</td>
                  <td className="px-3 py-2 text-right">
                    {suggestedQty !== null ? (
                      suggestedQty > 0
                        ? <span className="font-bold text-primary">{suggestedQty}</span>
                        : <span className="text-success text-[10px]">OK</span>
                    ) : <span className="text-muted-foreground text-[10px]">—</span>}
                  </td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-[10px]">
                    {abc ? `${abc.rankInCat}/${abc.totalInCat}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground text-center">{filtered.length} productos · Stock mín = 1.5× venta mensual · Stock máx = 3× venta mensual</p>
    </div>
  );
}