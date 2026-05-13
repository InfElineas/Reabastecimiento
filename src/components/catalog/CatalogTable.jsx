import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ImageOff } from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";

export default function CatalogTable({ offers, sortField, sortDir, onSort }) {
  const handleSort = (field) => {
    if (sortField === field) {
      onSort(field, sortDir === "asc" ? "desc" : "asc");
    } else {
      onSort(field, "asc");
    }
  };

  const SortHeader = ({ field, children, className }) => (
    <TableHead
      className={`cursor-pointer hover:text-foreground select-none text-xs ${className || ""}`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
        )}
      </span>
    </TableHead>
  );

  const clasificacionColors = {
    ambient: "bg-chart-3/10 text-chart-3",
    chilled: "bg-info/10 text-info",
    frozen: "bg-chart-4/10 text-chart-4",
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-xs">Foto</TableHead>
              <SortHeader field="codigo">Código</SortHeader>
              <SortHeader field="nombre" className="min-w-[200px]">Nombre</SortHeader>
              <SortHeader field="marca">Marca</SortHeader>
              <TableHead className="text-xs">Proveedor</TableHead>
              <SortHeader field="offer_external_id">Oferta ID</SortHeader>
              <SortHeader field="precio">Precio</SortHeader>
              <SortHeader field="existencia_fisica">Exist.</SortHeader>
              <TableHead className="text-xs">Reserva</TableHead>
              <TableHead className="text-xs">Tienda</TableHead>
              <TableHead className="text-xs">Clasif.</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Rev.</TableHead>
              <TableHead className="text-xs w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => (
              <TableRow key={offer.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="p-2">
                  {offer.fotos?.[0] ? (
                    <img src={offer.fotos[0]} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <ImageOff size={12} className="text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs font-mono font-medium">{offer.codigo}</TableCell>
                <TableCell className="text-xs max-w-[200px] truncate">{offer.nombre}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{offer.marca || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{offer.proveedor || "—"}</TableCell>
                <TableCell className="text-xs font-mono">{offer.offer_external_id}</TableCell>
                <TableCell className="text-xs font-medium">${offer.precio?.toFixed(2) || "0.00"}</TableCell>
                <TableCell className={`text-xs font-bold ${offer.existencia_fisica === 0 ? "text-destructive" : "text-foreground"}`}>
                  {offer.existencia_fisica ?? 0}
                </TableCell>
                <TableCell className="text-xs">{offer.stock_reserva ?? 0}</TableCell>
                <TableCell className="text-xs">{offer.stock_tienda ?? 0}</TableCell>
                <TableCell>
                  {offer.clasificacion && (
                    <Badge className={`text-[10px] ${clasificacionColors[offer.clasificacion] || ""}`}>
                      {offer.clasificacion}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <OfferStatusBadge offer={offer} />
                </TableCell>
                <TableCell className="text-xs">
                  {offer.revision && <Badge className="bg-warning/10 text-warning text-[10px]">Sí</Badge>}
                </TableCell>
                <TableCell className="p-1">
                  <Link
                    to={createPageUrl("OfferDetail") + `?id=${offer.id}`}
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {offers.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-12 text-sm">
                  No se encontraron ofertas con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}