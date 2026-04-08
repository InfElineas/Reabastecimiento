import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Package, Tag, ShoppingCart, Skull, RefreshCw, PackageX,
  Warehouse, AlertTriangle, BookOpen, GitCompare, Upload, BarChart2
} from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import AlertCard from "../components/dashboard/AlertCard";
import PhotoCoverageChart from "../components/dashboard/PhotoCoverageChart";
import InconsistencyChart from "../components/dashboard/InconsistencyChart";
import ImportHistory from "../components/dashboard/ImportHistory";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

export default function Dashboard() {
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ["offers"],
    queryFn: () => base44.entities.Offer.list("-created_date", 500),
  });

  const { data: importLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["importLogs"],
    queryFn: () => base44.entities.ImportLog.list("-created_date", 20),
  });

  const isLoading = loadingProducts || loadingOffers;

  // Compute metrics
  const totalProducts = products.length;
  const totalOffers = offers.length;
  const activeOffers = offers.filter((o) => !o.is_dead && o.existencia_fisica > 0).length;
  const deadOffers = offers.filter((o) => o.is_dead).length;
  const revisionOffers = offers.filter((o) => o.revision).length;
  const zeroStock = offers.filter((o) => !o.is_dead && o.existencia_fisica === 0).length;
  const reservaNoTienda = offers.filter((o) => o.stock_reserva > 0 && o.stock_tienda === 0).length;
  const inconsistent = offers.filter(
    (o) => o.existencia_fisica !== (o.stock_reserva || 0) + (o.stock_tienda || 0)
  ).length;
  const noCatalog = offers.filter((o) => !o.usa_catalogo).length;
  const catalogDiff = offers.filter((o) => o.has_catalog_diff).length;

  // Charts data
  const clasificacionData = [
    { name: "Ambiente", value: offers.filter((o) => o.clasificacion === "ambient").length },
    { name: "Refrigerado", value: offers.filter((o) => o.clasificacion === "chilled").length },
    { name: "Congelado", value: offers.filter((o) => o.clasificacion === "frozen").length },
  ].filter((d) => d.value > 0);

  const statusData = [
    { name: "Activas", value: activeOffers, color: "hsl(var(--accent))" },
    { name: "Sin stock", value: zeroStock, color: "hsl(var(--muted-foreground))" },
    { name: "Eliminadas", value: deadOffers, color: "hsl(var(--destructive))" },
    { name: "En revisión", value: revisionOffers, color: "hsl(var(--warning))" },
  ].filter((d) => d.value > 0);

  const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  const [alertSeverityFilter, setAlertSeverityFilter] = useState("all");

  // Alerts
  const alerts = [];
  if (inconsistent > 0) alerts.push({
    title: "Inconsistencia de inventario",
    count: inconsistent,
    severity: "critical",
    items: offers.filter((o) => o.existencia_fisica !== (o.stock_reserva || 0) + (o.stock_tienda || 0)).slice(0, 5).map((o) => `${o.codigo} - ${o.nombre}`)
  });
  if (zeroStock > 0) alerts.push({
    title: "Ofertas activas sin stock",
    count: zeroStock,
    severity: "warning",
    items: offers.filter((o) => !o.is_dead && o.existencia_fisica === 0).slice(0, 5).map((o) => `${o.codigo} - ${o.nombre}`)
  });
  if (reservaNoTienda > 0) alerts.push({
    title: "Reserva > 0, Tienda = 0",
    count: reservaNoTienda,
    severity: "warning",
    items: offers.filter((o) => o.stock_reserva > 0 && o.stock_tienda === 0).slice(0, 5).map((o) => `${o.codigo} - ${o.nombre}`)
  });
  if (catalogDiff > 0) alerts.push({
    title: "Diferencias de catálogo",
    count: catalogDiff,
    severity: "info",
    items: offers.filter((o) => o.has_catalog_diff).slice(0, 5).map((o) => `${o.codigo} - ${o.nombre}`)
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array(10).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-sm text-muted-foreground">
            Resumen operativo del inventario de ventas
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Última actualización: {new Date().toLocaleDateString("es-ES")}
        </Badge>
      </div>

      {/* KPIs Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Productos" value={totalProducts} icon={Package} variant="primary" />
        <StatCard title="Total Ofertas" value={totalOffers} icon={Tag} variant="default" />
        <StatCard title="Ofertas Activas" value={activeOffers} icon={ShoppingCart} variant="success" />
        <StatCard title="Eliminadas" value={deadOffers} icon={Skull} variant="destructive" />
        <StatCard title="En Revisión" value={revisionOffers} icon={RefreshCw} variant="warning" />
      </div>

      {/* KPIs Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard title="Stock = 0" value={zeroStock} icon={PackageX} variant="destructive" />
        <StatCard title="Solo Reserva" value={reservaNoTienda} icon={Warehouse} variant="warning" />
        <StatCard title="Inconsistentes" value={inconsistent} icon={AlertTriangle} variant="destructive" />
        <StatCard title="Sin Catálogo" value={noCatalog} icon={BookOpen} variant="info" />
        <StatCard title="Diff Catálogo" value={catalogDiff} icon={GitCompare} variant="info" />
      </div>

      {/* Charts Row 1: Status + Classification + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Estado de Ofertas</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}: <strong className="text-foreground">{d.value}</strong></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Classification Bar */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Clasificación</h3>
          {clasificacionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={clasificacionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {clasificacionData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Sin datos</div>
          )}
        </Card>

        {/* Alerts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Alertas Críticas</h3>
            <div className="flex gap-1">
              {["all", "critical", "warning", "info"].map(s => (
                <button
                  key={s}
                  onClick={() => setAlertSeverityFilter(s)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    alertSeverityFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {s === "all" ? "Todas" : s === "critical" ? "Crítica" : s === "warning" ? "Aviso" : "Info"}
                </button>
              ))}
            </div>
          </div>
          {alerts.filter(a => alertSeverityFilter === "all" || a.severity === alertSeverityFilter).length > 0 ? (
            alerts
              .filter(a => alertSeverityFilter === "all" || a.severity === alertSeverityFilter)
              .map((alert, i) => <AlertCard key={i} {...alert} />)
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground">Sin alertas activas</p>
            </Card>
          )}
        </div>
      </div>

      {/* Charts Row 2: Photo coverage + Inconsistency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PhotoCoverageChart products={products} />
        <InconsistencyChart offers={offers} />
      </div>

      {/* Import History */}
      <ImportHistory logs={importLogs} isLoading={loadingLogs} />

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2 pb-4">
        <Link to={createPageUrl("Catalog")}>
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/5 transition-colors py-1.5 px-3">
            <Package size={12} className="mr-1" /> Ver Catálogo Completo
          </Badge>
        </Link>
        <Link to={createPageUrl("Alerts")}>
          <Badge variant="outline" className="cursor-pointer hover:bg-destructive/5 transition-colors py-1.5 px-3">
            <AlertTriangle size={12} className="mr-1" /> Ver Todas las Alertas
          </Badge>
        </Link>
        <Link to={createPageUrl("DataImport")}>
          <Badge variant="outline" className="cursor-pointer hover:bg-accent/5 transition-colors py-1.5 px-3">
            <Upload size={12} className="mr-1" /> Importar Datos
          </Badge>
        </Link>
        <Link to="/ComparativeAnalysis">
          <Badge variant="outline" className="cursor-pointer hover:bg-primary/5 transition-colors py-1.5 px-3">
            <BarChart2 size={12} className="mr-1" /> Análisis Comparativo
          </Badge>
        </Link>
      </div>
    </div>
  );
}