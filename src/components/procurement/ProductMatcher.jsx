import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Check, Link2, X } from "lucide-react";

export default function ProductMatcher({ offerItem, existingMatch, onMatched }) {
  const [search, setSearch] = useState(existingMatch ? "" : (offerItem.supplier_product_code || offerItem.supplier_product_name || "").slice(0, 20));
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: internalOffers = [] } = useQuery({
    queryKey: ["offers-for-matching"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
    staleTime: 120000,
  });

  const suggestions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return internalOffers.filter((o) =>
      (o.codigo || "").toLowerCase().includes(q) ||
      (o.nombre || "").toLowerCase().includes(q) ||
      (o.marca || "").toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, internalOffers]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const payload = {
      offer_item_id: offerItem.id,
      offer_id: offerItem.offer_id,
      internal_offer_id: selected.id,
      internal_product_code: selected.codigo,
      internal_product_name: selected.nombre,
      match_type: "manual",
      match_confidence: 100,
      confirmed_at: new Date().toISOString(),
      status: "confirmed",
    };
    if (existingMatch) {
      await base44.entities.OfferItemMatch.update(existingMatch.id, payload);
    } else {
      await base44.entities.OfferItemMatch.create(payload);
    }
    queryClient.invalidateQueries({ queryKey: ["offer-matches"] });
    setSaving(false);
    setSelected(null);
    onMatched?.(selected);
  };

  const handleRemove = async () => {
    if (!existingMatch) return;
    await base44.entities.OfferItemMatch.update(existingMatch.id, { status: "rejected" });
    queryClient.invalidateQueries({ queryKey: ["offer-matches"] });
    onMatched?.(null);
  };

  return (
    <div className="space-y-2">
      {existingMatch && existingMatch.status === "confirmed" && (
        <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-md px-3 py-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Check size={12} className="text-success" />
            <span className="font-mono text-primary font-semibold">{existingMatch.internal_product_code}</span>
            <span className="text-muted-foreground truncate max-w-[140px]">{existingMatch.internal_product_name}</span>
          </div>
          <button onClick={handleRemove} className="text-muted-foreground hover:text-destructive transition-colors">
            <X size={12} />
          </button>
        </div>
      )}

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
          placeholder="Buscar por código o nombre..."
          className="pl-8 h-7 text-xs"
        />
      </div>

      {suggestions.length > 0 && (
        <div className="border border-border rounded-md overflow-hidden max-h-44 overflow-y-auto bg-card shadow-sm">
          {suggestions.map((o) => (
            <div
              key={o.id}
              onClick={() => setSelected(o)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted text-xs transition-colors ${selected?.id === o.id ? "bg-primary/10" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary font-semibold">{o.codigo}</span>
                <span className="text-foreground truncate max-w-[160px]">{o.nombre}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] ${o.existencia_fisica > 0 ? "text-success" : "text-muted-foreground"}`}>
                  {o.existencia_fisica ?? 0} u.
                </span>
                {selected?.id === o.id && <Check size={11} className="text-primary" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Button size="sm" className="w-full h-7 text-xs" onClick={handleSave} disabled={saving}>
          <Link2 size={12} className="mr-1.5" />
          {saving ? "Guardando..." : `Asociar con "${selected.codigo} — ${selected.nombre?.slice(0, 25)}"`}
        </Button>
      )}
    </div>
  );
}