import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ShoppingCart, Eye, CheckCircle, Send, XCircle, Package } from "lucide-react";

const STATUS_CONFIG = {
  borrador: { label: "Borrador", color: "bg-gray-100 text-gray-700", icon: null },
  confirmado: { label: "Confirmado", color: "bg-blue-100 text-blue-700" },
  enviado: { label: "Enviado", color: "bg-indigo-100 text-indigo-700" },
  parcialmente_recibido: { label: "Parcial", color: "bg-yellow-100 text-yellow-700" },
  recibido: { label: "Recibido", color: "bg-green-100 text-green-700" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-600" },
};

const STATUS_TRANSITIONS = {
  borrador: ["confirmado", "cancelado"],
  confirmado: ["enviado", "cancelado"],
  enviado: ["parcialmente_recibido", "recibido", "cancelado"],
  parcialmente_recibido: ["recibido", "cancelado"],
  recibido: [],
  cancelado: [],
};

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const isAdmin = user && !["comercial"].includes(user.role);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase-orders", user?.email],
    queryFn: () => isAdmin
      ? base44.entities.PurchaseOrder.list("-created_date", 200)
      : base44.entities.PurchaseOrder.filter({ created_by: user.email }, "-created_date", 200),
    enabled: !!user,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["po-items-all"],
    queryFn: () => base44.entities.PurchaseOrderItem.list("-created_date", 1000),
    enabled: !!user,
  });

  const itemsByOrder = React.useMemo(() => {
    const m = {};
    allItems.forEach(i => {
      if (!m[i.purchase_order_id]) m[i.purchase_order_id] = [];
      m[i.purchase_order_id].push(i);
    });
    return m;
  }, [allItems]);

  const updateStatus = async (orderId, newStatus) => {
    await base44.entities.PurchaseOrder.update(orderId, {
      status: newStatus,
      ...(newStatus === "confirmado" ? { confirmed_at: new Date().toISOString() } : {}),
    });
    queryClient.invalidateQueries(["purchase-orders"]);
    toast({ title: `Pedido actualizado: ${STATUS_CONFIG[newStatus]?.label}` });
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pedidos de Compra</h1>
          <p className="text-xs text-muted-foreground">{isAdmin ? "Vista global" : "Mis pedidos"}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/SupplierOffers")}>
          + Nueva oferta
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay pedidos generados aún.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(o => {
            const st = STATUS_CONFIG[o.status] || STATUS_CONFIG.borrador;
            const items = itemsByOrder[o.id] || [];
            const transitions = STATUS_TRANSITIONS[o.status] || [];
            const isExpanded = expandedId === o.id;
            return (
              <Card key={o.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{o.order_number || "Pedido"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>🏭 {o.supplier_name}</span>
                        <span>📄 {o.offer_name}</span>
                        <span>📦 {items.length} líneas</span>
                        <span className="font-medium text-foreground">{o.total_amount?.toFixed(2)} {o.currency}</span>
                        {isAdmin && <span>👤 {o.created_by}</span>}
                        {o.created_date && <span>{new Date(o.created_date).toLocaleDateString("es-ES")}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {transitions.map(t => (
                        <Button key={t} variant="outline" size="sm" onClick={() => updateStatus(o.id, t)}>
                          {STATUS_CONFIG[t]?.label}
                        </Button>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : o.id)}>
                        {isExpanded ? "Ocultar" : "Ver líneas"}
                      </Button>
                    </div>
                  </div>
                </div>
                {isExpanded && items.length > 0 && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Código</th>
                          <th className="text-left px-3 py-2 text-muted-foreground font-medium">Producto</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Sugerido</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium text-green-700">Final</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Precio</th>
                          <th className="text-right px-3 py-2 text-muted-foreground font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} className="border-t border-border">
                            <td className="px-3 py-1.5 font-mono">{item.internal_product_codigo || "—"}</td>
                            <td className="px-3 py-1.5 max-w-[200px] truncate">{item.internal_product_nombre}</td>
                            <td className="px-3 py-1.5 text-right text-blue-600">{item.suggested_qty}</td>
                            <td className="px-3 py-1.5 text-right font-semibold text-green-700">{item.ordered_qty}</td>
                            <td className="px-3 py-1.5 text-right">{item.unit_cost} {item.currency}</td>
                            <td className="px-3 py-1.5 text-right font-medium">{item.subtotal?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}