import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function OfferStatusBadge({ offer }) {
  if (offer.is_dead) {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Eliminada</Badge>;
  }
  if (offer.revision) {
    return <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">En revisión</Badge>;
  }
  if (offer.existencia_fisica === 0) {
    return <Badge className="bg-muted text-muted-foreground border-border text-[10px]">Sin stock</Badge>;
  }
  return <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Activa</Badge>;
}