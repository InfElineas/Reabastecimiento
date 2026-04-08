import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShoppingCart, Info, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useProcurementUser } from "@/hooks/useProcurementUser";

function roundUp(qty, multiple) {
  if (!multiple || multiple <= 1) return qty;
  return Math.ceil(qty / multiple) * multiple;
}

function getWarnings(qty, minQty, packMultiple) {
  const w = [];
  if (qty > 0 && qty < minQty) w.push(`Mín: ${minQty}`);
  if (packMultiple > 1 && qty > 0 && qty % packMultiple !== 0) w.push(`Múltiplo: ${packMultiple}`);
  return w;
}

export default function ProposalTable({ offer, matches, offerItems, internalOffers, onOrderCreated }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useProcurementUser();

  const rows = useMemo(() => {
    return matches
      .filter((m) => m.status === "confirmed")
      .map((match) => {
        const item = offerItems.find((i) => i.id === match.offer_item_id);
        const internal = internalOffers.find((o) => o.id === match.internal_offer_id);
        const currentStock = internal?.existencia_fisica ?? 0;
        const minStock = internal?.store_min_kontrol ?? 0;
        const minQty = item?.min_qty ?? 1;
        const packMultiple = item?.pack_multiple ?? 1;
        const rawSuggested = Math.max(minQty, minStock - currentStock);
        const suggested = rawSuggested > 0 ? roundUp(rawSuggested, packMultiple) : 0;
        return {
          matchId: match.id,
          itemId: match.offer_item_id,
          internalOfferId: match.internal_offer_id,
          code: match.internal_product_code,
          name: match.internal_product_name || item?.supplier_product_name || "",
          supplierName: item?.supplier_product_name || "",
          unitCost: item?.offered_cost ?? 0,
          currency: item?.currency || offer.currency || "USD",
          minQty,
          packMultiple,
          currentStock,
          suggestedQty: suggested,
        };
      });
  }, [matches, offerItems, internalOffers, offer]);

  const [decisions, setDecisions] = useState(() => {
    const d = {};
    // Initialized lazily after rows computed — update in effect below
    return d;
  });

  // Initialize decisions when rows change
  useMemo(() => {
    setDecisions((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (!next[r.matchId]) {
          next[r.matchId] = { finalQty: r.suggestedQty, included: r.suggestedQty > 0, overrideReason: "" };
        }
      });
      return next;
    });
  }, [rows.length]);

  const [creating, setCreating] = useState(false);

  const update = (matchId, field, value) => {
    setDecisions((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
  };

  const includedRows = rows.filter((r) => decisions[r.matchId]?.included && (decisions[r.matchId]?.finalQty || 0) > 0);
  const totalAmount = includedRows.reduce((sum, r) => sum + (decisions[r.matchId]?.finalQty || 0) * r.unitCost, 0);

  const handleCreate = async () => {
    if (includedRows.length === 0) {
      toast({ title: "Sin productos", description: "Selecciona al menos un producto con cantidad > 0.", variant: "destructive" });
      return;
    }
    setCreating(true);

    const order = await base44.entities.PurchaseOrder.create({
      supplier_name: offer.supplier_name,
      offer_id: offer.id,
      offer_name: offer.offer_name,
      status: "pendiente_revision",
      currency: offer.currency || "USD",
      exchange_rate: offer.exchange_rate || 1,
      total_amount: totalAmount,
      total_items: includedRows.length,
      created_by: user?.email || "",
    });

    const orderItems = includedRows.map((r) => {
      const d = decisions[r.matchId];
      return {
        purchase_order_id: order.id,
        offer_item_id: r.itemId,
        internal_offer_id: r.internalOfferId,
        internal_product_code: r.code,
        product_name: r.name,
        supplier_product_name: r.supplierName,
        unit_cost: r.unitCost,
        currency: r.currency,
        min_qty: r.minQty,
        pack_multiple: r.packMultiple,
        current_stock: r.currentStock,
        suggested_qty: r.suggestedQty,
        final_qty: d.finalQty,
        subtotal: d.finalQty * r.unitCost,
        override_reason: d.overrideReason || "",
        status: "included",
      };
    });

    await base44.entities.PurchaseOrderItem.bulkCreate(orderItems);
    await base44.entities.SupplierOffer.update(offer.id, { status: "ordered" });

    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["supplier-offers"] });

    toast({ title: "Pedido generado", description: `Pedido creado con ${includedRows.length} productos.` });
    setCreating(false);
    onOrderCreated?.();
    navigate(`/procurement/PurchaseOrderDetail/${order.id}`);
  };

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm space-y-2">
        <Info size={24} className="mx-auto opacity-40" />
        <p>No hay productos asociados confirmados todavía.</p>
        <p className="text-xs">Ve a la pestaña <strong>Asociación</strong> y confirma los productos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="bg-primary/10 rounded-lg px-4 py-2">
          <p className="text-lg font-bold text-primary">{includedRows.length}</p>
          <p className="text-xs text-muted-foreground">Seleccionados</p>
        </div>
        <div className="bg-success/10 rounded-lg px-4 py-2">
          <p className="text-lg font-bold text-success">{offer.currency || "USD"} {totalAmount.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total estimado</p>
        </div>
        {offer.exchange_rate && offer.exchange_rate !== 1 && (
          <div className="bg-muted rounded-lg px-4 py-2">
            <p className="text-lg font-bold">{(totalAmount * offer.exchange_rate).toFixed(2)} CUP</p>
            <p className="text-xs text-muted-foreground">Equivalente (TC: {offer.exchange_rate})</p>
          </div>
        )}
        <Badge variant="outline" className="ml-auto text-xs">
          <Sparkles size={11} className="mr-1 text-primary" /> Cantidad sugerida = sistema · Cantidad final = tu decisión
        </Badge>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">✓</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Stock actual</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground text-blue-500">Sugerido</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground text-primary">Cant. Final ✍</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Precio u.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Motivo ajuste</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = decisions[r.matchId] || { finalQty: r.suggestedQty, included: false, overrideReason: "" };
              const warnings = getWarnings(d.finalQty || 0, r.minQty, r.packMultiple);
              const isOverride = (d.finalQty || 0) !== r.suggestedQty;
              const subtotal = (d.finalQty || 0) * r.unitCost;
              return (
                <tr key={r.matchId} className={`border-b border-border/50 transition-opacity ${!d.included ? "opacity-40" : ""}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={!!d.included} onChange={(e) => update(r.matchId, "included", e.target.checked)} className="rounded" />
                  </td>
                  <td className="px-3 py-2 font-mono text-primary font-semibold">{r.code}</td>
                  <td className="px-3 py-2 max-w-[160px]">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-muted-foreground truncate text-[10px]">{r.supplierName !== r.name ? r.supplierName : ""}</p>
                  </td>
                  <td className="px-3 py-2 text-right">{r.currentStock}</td>
                  <td className="px-3 py-2 text-right text-blue-500">{r.suggestedQty}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        value={d.finalQty ?? ""}
                        onChange={(e) => update(r.matchId, "finalQty", parseInt(e.target.value) || 0)}
                        disabled={!d.included}
                        className={`h-7 w-20 text-center text-xs ${warnings.length ? "border-warning" : ""} ${isOverride ? "border-primary bg-primary/5 font-bold" : ""}`}
                      />
                      {warnings.map((w, i) => (
                        <span key={i} className="flex items-center gap-0.5 text-warning text-[10px]">
                          <AlertTriangle size={9} /> {w}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{r.currency} {r.unitCost.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{r.currency} {subtotal.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {isOverride && d.included && (
                      <Input
                        placeholder="Motivo..."
                        value={d.overrideReason}
                        onChange={(e) => update(r.matchId, "overrideReason", e.target.value)}
                        className="h-7 text-xs w-28"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Button onClick={handleCreate} disabled={creating || includedRows.length === 0} className="w-full">
        <ShoppingCart size={15} className="mr-2" />
        {creating ? "Generando pedido..." : `Generar Pedido de Compra — ${includedRows.length} productos · ${offer.currency || "USD"} ${totalAmount.toFixed(2)}`}
      </Button>
    </div>
  );
}