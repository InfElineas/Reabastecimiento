import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Search, Check, X, Zap, Link2 } from "lucide-react";

function similarity(a = "", b = "") {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 70;
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const common = wordsA.filter(w => w.length > 2 && wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return Math.min(60, Math.round((common.length / Math.max(wordsA.length, 1)) * 100));
}

export default function ProductMatching() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const offerId = params.get("offer_id");

  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState({});
  const [saving, setSaving] = useState({});

  React.useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: offer } = useQuery({
    queryKey: ["supplier-offer", offerId],
    queryFn: () => base44.entities.SupplierOffer.filter({ id: offerId }),
    select: d => d[0], enabled: !!offerId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["offer-items", offerId],
    queryFn: () => base44.entities.SupplierOfferItem.filter({ offer_id: offerId }, "row_index", 500),
    enabled: !!offerId,
  });

  const { data: matches = [], refetch: refetchMatches } = useQuery({
    queryKey: ["offer-matches", offerId],
    queryFn: () => base44.entities.SupplierOfferItemMatch.filter({ offer_id: offerId }, "-created_date", 500),
    enabled: !!offerId,
  });

  const { data: internalOffers = [] } = useQuery({
    queryKey: ["offers-for-matching"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
  });

  const matchedMap = useMemo(() => {
    const m = {};
    matches.forEach(match => { m[match.offer_item_id] = match; });
    return m;
  }, [matches]);

  const autoSuggestions = useMemo(() => {
    const suggestions = {};
    items.forEach(item => {
      if (matchedMap[item.id]) return;
      let best = null, bestScore = 0;
      internalOffers.forEach(io => {
        const codeScore = item.supplier_product_code && io.codigo &&
          item.supplier_product_code.toLowerCase() === io.codigo.toLowerCase() ? 90 : 0;
        const nameScore = similarity(item.supplier_product_name, io.nombre);
        const score = Math.max(codeScore, nameScore);
        if (score > bestScore && score >= 40) { bestScore = score; best = io; }
      });
      if (best) suggestions[item.id] = { product: best, confidence: bestScore };
    });
    return suggestions;
  }, [items, internalOffers, matchedMap]);

  const handleMatch = async (item, product, matchType = "manual", confidence = 100) => {
    setSaving(s => ({ ...s, [item.id]: true }));
    const existing = matchedMap[item.id];
    if (existing) {
      await base44.entities.SupplierOfferItemMatch.update(existing.id, {
        internal_product_id: product.id,
        internal_product_codigo: product.codigo,
        internal_product_nombre: product.nombre,
        match_type: matchType,
        match_confidence: confidence,
        confirmed_by: user?.email,
        confirmed_at: new Date().toISOString(),
      });
    } else {
      await base44.entities.SupplierOfferItemMatch.create({
        offer_item_id: item.id,
        offer_id: offerId,
        imported_by: user?.email,
        internal_product_id: product.id,
        internal_product_codigo: product.codigo,
        internal_product_nombre: product.nombre,
        match_type: matchType,
        match_confidence: confidence,
        confirmed_by: user?.email,
        confirmed_at: new Date().toISOString(),
      });
    }
    await refetchMatches();
    setSaving(s => ({ ...s, [item.id]: false }));
    toast({ title: `Asociado: ${product.codigo} — ${product.nombre?.slice(0, 40)}` });
  };

  const handleRemoveMatch = async (itemId) => {
    const existing = matchedMap[itemId];
    if (!existing) return;
    await base44.entities.SupplierOfferItemMatch.delete(existing.id);
    await refetchMatches();
  };

  const applyAllSuggestions = async () => {
    setSaving({ _all: true });
    for (const [itemId, sugg] of Object.entries(autoSuggestions)) {
      const item = items.find(i => i.id === itemId);
      if (item) await handleMatch(item, sugg.product, "auto_nombre", sugg.confidence);
    }
    setSaving({});
    toast({ title: `${Object.keys(autoSuggestions).length} asociaciones automáticas aplicadas` });
  };

  const filteredProducts = (itemId) => {
    const q = (searchQuery[itemId] || "").toLowerCase();
    if (!q) return internalOffers.slice(0, 8);
    return internalOffers.filter(p =>
      (p.codigo || "").toLowerCase().includes(q) || (p.nombre || "").toLowerCase().includes(q)
    ).slice(0, 10);
  };

  const totalMatched = Object.keys(matchedMap).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/OfferDetail?id=${offerId}`)}>
          <ArrowLeft size={15} />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Asociación de Productos</h1>
          <p className="text-xs text-muted-foreground">{offer?.offer_name} — {offer?.supplier_name}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalMatched} / {items.length} asociadas
        </div>
        {Object.keys(autoSuggestions).length > 0 && (
          <Button variant="outline" size="sm" onClick={applyAllSuggestions}>
            <Zap size={13} className="mr-1 text-yellow-500" /> Aplicar {Object.keys(autoSuggestions).length} sugerencias
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {items.map(item => {
          const matched = matchedMap[item.id];
          const suggestion = autoSuggestions[item.id];
          const isSearching = searchQuery[item.id] !== undefined;
          return (
            <Card key={item.id} className={`p-4 ${matched ? "border-green-200 dark:border-green-800" : "border-yellow-200 dark:border-yellow-800"}`}>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Offer item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.supplier_product_name}</span>
                    {item.supplier_product_code && <span className="text-xs text-muted-foreground font-mono">[{item.supplier_product_code}]</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    {item.format && <span>{item.format}</span>}
                    {item.offered_cost > 0 && <span className="font-medium text-foreground">{item.offered_cost} {item.currency}</span>}
                    <span>Mín: {item.min_qty || 1} | ×{item.pack_multiple || 1}</span>
                    {item.availability && <span>{item.availability}</span>}
                  </div>
                </div>

                {/* Match area */}
                <div className="flex-1 min-w-0">
                  {matched ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                        <div className="text-xs font-medium text-green-700 dark:text-green-400">✓ Asociado</div>
                        <div className="text-sm font-semibold">{matched.internal_product_codigo} — {matched.internal_product_nombre}</div>
                        <div className="text-xs text-muted-foreground">{matched.match_type} {matched.match_confidence ? `(${matched.match_confidence}%)` : ""}</div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMatch(item.id)}>
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {suggestion && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">Sugerencia ({suggestion.confidence}%)</div>
                            <div className="text-sm font-medium">{suggestion.product.codigo} — {suggestion.product.nombre?.slice(0,40)}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleMatch(item, suggestion.product, "auto_nombre", suggestion.confidence)}>
                            <Check size={13} />
                          </Button>
                        </div>
                      )}
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-8 h-8 text-xs"
                          placeholder="Buscar producto interno..."
                          value={searchQuery[item.id] || ""}
                          onChange={e => setSearchQuery(q => ({ ...q, [item.id]: e.target.value }))}
                        />
                      </div>
                      {searchQuery[item.id] !== undefined && (
                        <div className="bg-card border border-border rounded-lg max-h-40 overflow-y-auto">
                          {filteredProducts(item.id).map(p => (
                            <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-xs border-b border-border last:border-0 flex items-center justify-between gap-2"
                              onClick={() => { handleMatch(item, p, "manual", 100); setSearchQuery(q => ({ ...q, [item.id]: undefined })); }}>
                              <span><strong>{p.codigo}</strong> — {p.nombre?.slice(0,50)}</span>
                              <span className="text-muted-foreground flex-shrink-0">{p.existencia_fisica ?? 0} u.</span>
                            </button>
                          ))}
                          {filteredProducts(item.id).length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Esta oferta no tiene líneas importadas.</p>
        </Card>
      )}
    </div>
  );
}