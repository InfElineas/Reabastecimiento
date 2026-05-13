import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, FileText, Link2, AlertTriangle, TrendingUp, Package, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

function StatCard({ title, value, sub, icon: Icon, color = "bg-primary/10 text-primary" }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </Card>
  );
}

export default function PurchasingDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user && !["comercial"].includes(user.role);

  const { data: offers = [] } = useQuery({
    queryKey: ["purch-offers", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.SupplierOffer.list("-created_date", 500)
      : base44.entities.SupplierOffer.filter({ imported_by: user.email }, "-created_date", 500),
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["purch-items", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.SupplierOfferItem.list("-created_date", 1000)
      : base44.entities.SupplierOfferItem.filter({ imported_by: user.email }, "-created_date", 1000),
    enabled: !!user,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["purch-matches", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.SupplierOfferItemMatch.list("-created_date", 1000)
      : base44.entities.SupplierOfferItemMatch.filter({ imported_by: user.email }, "-created_date", 1000),
    enabled: !!user,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["purch-orders", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.PurchaseOrder.list("-created_date", 500)
      : base44.entities.PurchaseOrder.filter({ created_by: user.email }, "-created_date", 500),
    enabled: !!user,
  });

  const now = new Date();
  const activeOffers = offers.filter(o => !o.valid_until || new Date(o.valid_until) >= now);
  const expiredOffers = offers.filter(o => o.valid_until && new Date(o.valid_until) < now);
  const pendingMatch = items.length - matches.length;
  const totalAmount = orders.filter(o => o.status !== "cancelado").reduce((s, o) => s + (o.total_amount || 0), 0);

  const supplierChart = useMemo(() => {
    const map = {};
    offers.forEach(o => { map[o.supplier_name] = (map[o.supplier_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
  }, [offers]);

  const statusChart = useMemo(() => {
    const map = {};
    orders.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([status, count]) => ({ name: status, count }));
  }, [orders]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1300px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard de Compras</h1>
          <p className="text-xs text-muted-foreground">{isAdmin ? "Vista global del módulo" : "Tu gestión personal"}</p>
        </div>
        <Button onClick={() => navigate("/SupplierOffers")}>
          <FileText size={14} className="mr-1.5" /> Mis Ofertas
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Ofertas totales" value={offers.length} icon={FileText} />
        <StatCard title="Ofertas activas" value={activeOffers.length} icon={Clock} color="bg-green-100 text-green-700" />
        <StatCard title="Vencidas" value={expiredOffers.length} icon={AlertTriangle} color="bg-red-100 text-red-700" />
        <StatCard title="Pendientes asociar" value={Math.max(0, pendingMatch)} icon={Link2} color="bg-yellow-100 text-yellow-700" />
        <StatCard title="Pedidos" value={orders.length} icon={ShoppingCart} color="bg-purple-100 text-purple-700" />
        <StatCard title="Monto total" value={totalAmount.toFixed(0)} sub="moneda original" icon={TrendingUp} color="bg-indigo-100 text-indigo-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Ofertas por proveedor</h3>
          {supplierChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={supplierChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {supplierChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin datos</div>}
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Estado de pedidos</h3>
          {statusChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">Sin pedidos generados</div>}
        </Card>
      </div>

      {/* Recent offers */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Ofertas recientes</h3>
        <div className="space-y-2">
          {offers.slice(0, 5).map(o => {
            const isVencida = o.valid_until && new Date(o.valid_until) < now;
            return (
              <div key={o.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <span className="text-sm font-medium">{o.offer_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">— {o.supplier_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isVencida && <Badge className="text-[10px] bg-red-100 text-red-700 border-0">Vencida</Badge>}
                  <span className="text-xs text-muted-foreground">{o.valid_rows || 0} líneas</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/OfferDetail?id=${o.id}`)}>Ver</Button>
                </div>
              </div>
            );
          })}
          {offers.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ofertas importadas.</p>}
        </div>
      </Card>
    </div>
  );
}