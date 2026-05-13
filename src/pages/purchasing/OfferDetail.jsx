import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Link2, ShoppingCart, Package } from "lucide-react";

const STATUS_CONFIG = {
  borrador: "bg-gray-100 text-gray-700",
  importada: "bg-blue-100 text-blue-700",
  procesada: "bg-indigo-100 text-indigo-700",
  asociada_parcial: "bg-yellow-100 text-yellow-700",
  asociada_completa: "bg-green-100 text-green-700",
  usada_en_pedido: "bg-purple-100 text-purple-700",
  vencida: "bg-red-100 text-red-700",
  archivada: "bg-gray-200 text-gray-500",
};

export default function OfferDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("id");

  const { data: offer, isLoading: loadOffer } = useQuery({
    queryKey: ["supplier-offer", offerId],
    queryFn: () => base44.entities.SupplierOffer.filter({ id: offerId }),
    select: d => d[0],
    enabled: !!offerId,
  });

  const { data: items = [], isLoading: loadItems } = useQuery({
    queryKey: ["offer-items", offerId],
    queryFn: () => base44.entities.SupplierOfferItem.filter({ offer_id: offerId }, "row_index", 500),
    enabled: !!offerId,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["offer-matches", offerId],
    queryFn: () => base44.entities.SupplierOfferItemMatch.filter({ offer_id: offerId }, "-created_date", 500),
    enabled: !!offerId,
  });

  const matchedIds = new Set(matches.map(m => m.offer_item_id));

  if (loadOffer) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!offer) return <div className="p-8 text-center text-muted-foreground">Oferta no encontrada.</div>;

  const isVencida = offer.valid_until && new Date(offer.valid_until) < new Date();

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/SupplierOffers")}>
          <ArrowLeft size={15} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{offer.offer_name}</h1>
          <p className="text-xs text-muted-foreground">{offer.supplier_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/ProductMatching?offer_id=${offer.id}`)}>
            <Link2 size={13} className="mr-1" /> Asociar Productos
          </Button>
          <Button size="sm" onClick={() => navigate(`/ReplenishmentProposal?offer_id=${offer.id}`)}>
            <ShoppingCart size={13} className="mr-1" /> Ver Propuesta
          </Button>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Estado</p>
          <span className={`text-xs px-2 py-1 rounded-full font-medium mt-1 inline-block ${STATUS_CONFIG[offer.status] || "bg-gray-100"}`}>
            {offer.status}
          </span>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total líneas</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Asociadas</p>
          <p className="text-2xl font-bold text-green-600">{matchedIds.size}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">{items.length - matchedIds.size}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><span className="text-muted-foreground">Vigencia:</span> {offer.valid_from || "—"} → {offer.valid_until || "—"}{isVencida && <span className="ml-1 text-red-600 font-medium">⚠ Vencida</span>}</div>
        <div><span className="text-muted-foreground">Moneda:</span> {offer.default_currency} (×{offer.exchange_rate || 1} {offer.base_currency})</div>
        <div><span className="text-muted-foreground">Importada por:</span> {offer.imported_by}</div>
        <div><span className="text-muted-foreground">Fecha:</span> {offer.created_date ? new Date(offer.created_date).toLocaleDateString("es-ES") : "—"}</div>
      </div>

      {/* Items table */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">Líneas de la Oferta</h3>
          <span className="text-xs text-muted-foreground">{items.length} productos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Código</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Formato</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Precio</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Mín</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Múltiplo</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Disponib.</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground">Asociado</th>
              </tr>
            </thead>
            <tbody>
              {loadItems ? (
                <tr><td colSpan={9} className="text-center py-6 text-muted-foreground">Cargando...</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} className={`border-t border-border hover:bg-muted/30 ${matchedIds.has(item.id) ? "" : "bg-yellow-50/40 dark:bg-yellow-900/5"}`}>
                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2 font-mono">{item.supplier_product_code || "—"}</td>
                  <td className="px-3 py-2 max-w-[200px] truncate">{item.supplier_product_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{item.format || "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">{item.offered_cost > 0 ? `${item.offered_cost} ${item.currency}` : "—"}</td>
                  <td className="px-3 py-2 text-right">{item.min_qty || 1}</td>
                  <td className="px-3 py-2 text-right">{item.pack_multiple || 1}</td>
                  <td className="px-3 py-2">{item.availability || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    {matchedIds.has(item.id)
                      ? <span className="text-green-600">✓</span>
                      : <span className="text-yellow-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}