import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Package } from "lucide-react";
import CatalogFilters from "../components/catalog/CatalogFilter";
import CatalogTable from "../components/catalog/CatalogTable";
import ExportPDF from "../components/catalog/ExportPDF";
import ExportExcel from "../components/catalog/ExportExcel";

export default function Catalog() {
  const [filters, setFilters] = useState({
    search: "", clasificacion: "all", is_dead: "all", revision: "all",
    usa_catalogo: "all", has_catalog_diff: "all", categoria_online: "all",
    proveedor: "all", stock_status: "all"
  });
  const [sortField, setSortField] = useState("nombre");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["offers-catalog"],
    queryFn: () => base44.entities.Offer.list("-updated_date", 500),
  });

  const proveedores = useMemo(() =>
    [...new Set(offers.map((o) => o.proveedor).filter(Boolean))].sort(),
    [offers]
  );

  const filtered = useMemo(() => {
    let result = [...offers];

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter((o) =>
        (o.codigo || "").toLowerCase().includes(s) ||
        (o.nombre || "").toLowerCase().includes(s) ||
        (o.marca || "").toLowerCase().includes(s) ||
        (o.offer_external_id || "").toLowerCase().includes(s)
      );
    }

    if (filters.clasificacion !== "all") result = result.filter((o) => o.clasificacion === filters.clasificacion);
    if (filters.is_dead === "active") result = result.filter((o) => !o.is_dead);
    if (filters.is_dead === "dead") result = result.filter((o) => o.is_dead);
    if (filters.revision === "yes") result = result.filter((o) => o.revision);
    if (filters.revision === "no") result = result.filter((o) => !o.revision);
    if (filters.usa_catalogo === "yes") result = result.filter((o) => o.usa_catalogo);
    if (filters.usa_catalogo === "no") result = result.filter((o) => !o.usa_catalogo);
    if (filters.has_catalog_diff === "yes") result = result.filter((o) => o.has_catalog_diff);
    if (filters.has_catalog_diff === "no") result = result.filter((o) => !o.has_catalog_diff);
    if (filters.proveedor !== "all") result = result.filter((o) => o.proveedor === filters.proveedor);
    if (filters.stock_status === "in_stock") result = result.filter((o) => o.existencia_fisica > 0);
    if (filters.stock_status === "no_stock") result = result.filter((o) => o.existencia_fisica === 0);
    if (filters.stock_status === "reserva_only") result = result.filter((o) => o.stock_reserva > 0 && o.stock_tienda === 0);

    // Sort
    result.sort((a, b) => {
      let va = a[sortField] ?? "";
      let vb = b[sortField] ?? "";
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return result;
  }, [offers, filters, sortField, sortDir]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = () => {
    const headers = ["codigo", "nombre", "marca", "proveedor", "offer_external_id", "precio", "existencia_fisica", "stock_reserva", "stock_tienda", "clasificacion", "is_dead", "revision"];
    const rows = filtered.map((o) => headers.map((h) => JSON.stringify(o[h] ?? "")).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catalogo_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Catálogo Consolidado</h1>
            <p className="text-xs text-muted-foreground">
              {filtered.length} ofertas{filtered.length !== offers.length && ` de ${offers.length}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1.5" /> CSV
          </Button>
          <ExportExcel offers={filtered} filters={filters} />
          <ExportPDF offers={filtered} filters={filters} />
        </div>
      </div>

      <CatalogFilters
        filters={filters}
        onFiltersChange={(f) => { setFilters(f); setPage(0); }}
        proveedores={proveedores}
      />

      <CatalogTable
        offers={paginated}
        sortField={sortField}
        sortDir={sortDir}
        onSort={(field, dir) => { setSortField(field); setSortDir(dir); }}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              {page + 1} / {totalPages}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}