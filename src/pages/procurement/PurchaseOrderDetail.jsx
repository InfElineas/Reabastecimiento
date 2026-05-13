import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Printer, AlertTriangle, CheckCircle2, Package, Truck, FileDown, Edit3 } from "lucide-react";
import { generatePurchaseOrderPDF } from "@/components/procurement/PurchaseOrderPDF";
import EditOrderDialog from "@/components/procurement/EditOrderDialog";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useProcurementUser } from "@/hooks/useProcurementUser";

const STATUS_CONFIG = {
  borrador: "Borrador",
  pendiente_revision: "Pendiente de Revisión",
  confirmado: "Confirmado",
  enviado: "Enviado",
  parcialmente_recibido: "Recibido parcial",
  recibido: "Recibido",
  cancelado: "Cancelado",
};

export default function PurchaseOrderDetail() {
  const id = window.location.pathname.split("/").pop();
  const { isAdmin, user } = useProcurementUser();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["purchase-order", id],
    queryFn: () => base44.entities.PurchaseOrder.filter({ id }),
    select: d => d[0],
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ["purchase-order-items", id],
    queryFn: () => base44.entities.PurchaseOrderItem.filter({ purchase_order_id: id }, "product_name", 200),
    enabled: !!id,
  });

  if (loadingOrder || loadingItems) return <div className="p-6 space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-[400px] w-full" /></div>;
  if (!order) return <div className="p-6 text-muted-foreground">Pedido no encontrado.</div>;

  const totalAmount = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const manualOverrides = items.filter(i => i.suggested_qty !== i.final_qty);

  const canApprove = isAdmin && order.status === "pendiente_revision";
  const canSubmitForReview = !isAdmin && order.status === "borrador";

  const updateStatus = async (status, extra = {}) => {
    const update = { status, ...extra };
    if (status === "confirmado") {
      update.confirmed_at = new Date().toISOString();
      update.confirmed_by = user?.email;
    }
    await base44.entities.PurchaseOrder.update(order.id, update);
    queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/procurement/PurchaseOrders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft size={13} /> Volver a Pedidos
          </Link>
          <h1 className="text-xl font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Truck size={13} /> {order.supplier_name}</span>
            <Badge variant="secondary">{STATUS_CONFIG[order.status] || order.status}</Badge>
            <Badge variant="outline" className="text-xs">{order.currency || "USD"}{order.exchange_rate && order.exchange_rate !== 1 ? ` · TC: ${order.exchange_rate}` : ""}</Badge>
          </div>
        </div>
        <div className="flex gap-2 items-start flex-wrap">
          {canSubmitForReview && (
            <Button size="sm" onClick={() => updateStatus("pendiente_revision")}>
              Enviar a Revisión
            </Button>
          )}
          {canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
                <Edit3 size={13} className="mr-1.5" /> Editar Pedido
              </Button>
              <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => updateStatus("confirmado")}>
                ✓ Aprobar Pedido
              </Button>
              <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelado", { rejection_reason: "Rechazado por supervisor" })}>
                ✗ Rechazar
              </Button>
            </>
          )}
          {isAdmin && !canApprove && (
            <>
              <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
                <Edit3 size={13} className="mr-1.5" /> Editar
              </Button>
              <Select value={order.status} onValueChange={updateStatus}>
                <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generatePurchaseOrderPDF(order, items)}
          >
            <FileDown size={13} className="mr-1.5" /> Descargar PDF
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-primary">{items.length}</p>
          <p className="text-xs text-muted-foreground">Productos</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-success">{order.currency || "USD"} {totalAmount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-warning">{manualOverrides.length}</p>
          <p className="text-xs text-muted-foreground">Ajustes manuales</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-sm font-bold">{format(new Date(order.created_date), "dd MMM yyyy", { locale: es })}</p>
          <p className="text-xs text-muted-foreground">Creado</p>
          {isAdmin && <p className="text-[10px] text-muted-foreground">por {order.created_by}</p>}
        </Card>
      </div>

      {/* Offer reference */}
      {order.source_offer_id && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package size={13} />
          Originado desde oferta:{" "}
          <Link to={`/procurement/SupplierOfferDetail/${order.source_offer_id}`} className="text-primary hover:underline font-medium">
            {order.offer_name}
          </Link>
        </div>
      )}

      {/* Items table */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Líneas del Pedido</h3>
          {manualOverrides.length > 0 && (
            <Badge variant="outline" className="text-xs text-warning border-warning">
              <AlertTriangle size={10} className="mr-1" /> {manualOverrides.length} ajuste(s) manual(es)
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Código", "Producto", "Unidad", "Stock actual", "Sugerido", "Cant. Final", "Precio unit.", "Subtotal", "Ajuste"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isOverride = item.suggested_qty !== item.final_qty;
                return (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-primary font-semibold">{item.internal_product_code || "—"}</td>
                    <td className="px-3 py-2 max-w-[180px]">
                      <p className="font-medium truncate">{item.product_name}</p>
                      {item.supplier_product_name !== item.product_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{item.supplier_product_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">{item.unit || "—"}</td>
                    <td className="px-3 py-2">{item.current_stock ?? "—"}</td>
                    <td className="px-3 py-2 text-blue-500">{item.suggested_qty ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <span className={`font-bold ${isOverride ? "text-primary" : ""}`}>{item.final_qty}</span>
                        {isOverride && <CheckCircle2 size={11} className="text-primary" />}
                      </div>
                    </td>
                    <td className="px-3 py-2">{item.currency || order.currency} {(item.unit_cost || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 font-semibold">{item.currency || order.currency} {(item.subtotal || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-muted-foreground italic">{item.override_reason || ""}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={7} className="px-3 py-2 text-right font-semibold text-sm">Total:</td>
                <td className="px-3 py-2 font-bold text-sm">{order.currency || "USD"} {totalAmount.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {order.notes && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-1">Observaciones</h3>
          <p className="text-sm">{order.notes}</p>
        </Card>
      )}

      <EditOrderDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        order={order}
        items={items}
      />
    </div>
  );
}