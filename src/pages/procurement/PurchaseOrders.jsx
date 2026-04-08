import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Search, ExternalLink, Truck, Package, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useProcurementUser } from "@/hooks/useProcurementUser";

const STATUS_CONFIG = {
  borrador: { label: "Borrador", variant: "secondary" },
  pendiente_revision: { label: "Pendiente Revisión", variant: "outline" },
  confirmado: { label: "Confirmado", variant: "default" },
  enviado: { label: "Enviado", variant: "default" },
  parcialmente_recibido: { label: "Recibido parcial", variant: "outline" },
  recibido: { label: "Recibido", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export default function PurchaseOrders() {
  const { isLoading: loadingUser, isAdmin, getOwnerFilter } = useProcurementUser();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filter = getOwnerFilter();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", filter],
    queryFn: () => filter ? base44.entities.PurchaseOrder.filter(filter, "-created_date", 200) : base44.entities.PurchaseOrder.list("-created_date", 200),
    enabled: !loadingUser,
  });

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const ms = !q || (o.supplier_name || "").toLowerCase().includes(q) || (o.offer_name || "").toLowerCase().includes(q);
    const mst = statusFilter === "all" || o.status === statusFilter;
    return ms && mst;
  });

  const totalAmount = filtered.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total_amount || 0), 0);

  if (loadingUser || isLoading) return <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardList size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pedidos de Compra</h1>
            <p className="text-xs text-muted-foreground">{filtered.length} pedido(s){isAdmin ? " — vista global" : ""}</p>
          </div>
        </div>
        <div className="bg-success/10 rounded-lg px-4 py-2 text-right">
          <p className="text-sm font-bold text-success">Total activo</p>
          <p className="text-lg font-bold">{totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input placeholder="Buscar proveedor u oferta..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <ClipboardList size={32} className="mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Sin pedidos. Genera uno desde una oferta asociada.</p>
            <Link to="/procurement/SupplierOffers" className="mt-3 inline-block">
              <Button size="sm" variant="outline">Ver ofertas</Button>
            </Link>
          </Card>
        ) : filtered.map(order => {
          const status = STATUS_CONFIG[order.status] || { label: order.status, variant: "secondary" };
          return (
            <Card key={order.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">Pedido #{order.id.slice(-6).toUpperCase()}</span>
                    <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Truck size={11} /> {order.supplier_name}</span>
                    <span className="flex items-center gap-1"><Package size={11} /> {order.total_items || 0} ítems</span>
                    <span className="flex items-center gap-1"><DollarSign size={11} /> {order.currency || "USD"} {(order.total_amount || 0).toFixed(2)}</span>
                    <span>{format(new Date(order.created_date), "dd MMM yyyy", { locale: es })}</span>
                    {isAdmin && <span className="text-[10px] italic">por: {order.created_by}</span>}
                  </div>
                  {order.offer_name && <p className="text-[10px] text-muted-foreground">Oferta: {order.offer_name}</p>}
                </div>
                <Link to={`/procurement/PurchaseOrderDetail/${order.id}`}>
                  <Button size="sm" variant="outline">
                    <ExternalLink size={13} className="mr-1.5" /> Ver detalle
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}