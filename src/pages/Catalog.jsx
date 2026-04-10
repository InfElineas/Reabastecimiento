import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Package, Loader2 } from "lucide-react";
import CatalogFilters from "../components/catalog/CatalogFilter";
import CatalogTable from "../components/catalog/CatalogTable";
import ExportPDF from "../components/catalog/ExportPDF";
import ExportExcel from "../components/catalog/ExportExcel";

const PAGE_SIZE = 50;

/**
 * Convierte el estado de filtros de la UI en parámetros para filterPaginated.
 */
function buildServerQuery(filters, sortField, sortDir, page) {
  const conditions    = {};
  const extraFilters  = [];

  // Booleanos
  if (filters.is_dead === "active")  conditions.is_dead = false;
  if (filters.is_dead === "dead")    conditions.is_dead = true;
  if (filters.revision === "yes")    conditions.revision = true;
  if (filters.revision === "no")     conditions.revision = false;
  if (filters.usa_catalogo === "yes")       conditions.usa_catalogo = true;
  if (filters.usa_catalogo === "no")        conditions.usa_catalogo = false;
  if (filters.has_catalog_diff === "yes")   conditions.has_catalog_diff = true;
  if (filters.has_catalog_diff === "no")    conditions.has_catalog_diff = false;

  // Strings
  if (filters.clasificacion !== "all")      conditions.clasificacion = filters.clasificacion;
  if (filters.proveedor !== "all")          conditions.proveedor = filters.proveedor;
  if (filters.categoria_online !== "all")   conditions.categoria_online = filters.categoria_online;

  // Stock
  if (filters.stock_status === "in_stock")
    extraFilters.push({ type: "gt",  column: "existencia_fisica", value: 0 });
  if (filters.stock_status === "no_stock")
    extraFilters.push({ type: "lte", column: "existencia_fisica", value: 0 });
  if (filters.stock_status === "reserva_only") {
    extraFilters.push({ type: "gt",  column: "stock_reserva", value: 0 });
    extraFilters.push({ type: "lte", column: "stock_tienda",  value: 0 });
  }

  // Búsqueda de texto
  const search = filters.search?.trim()
    ? { text: filters.search, columns: ["nombre", "codigo", "offer_external_id"] }
    : null;

  return {
    conditions,
    search,
    extraFilters,
    orderBy: sortDir === "desc" ? `-${sortField}` : sortField,
    limit:  PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
}

export default function Catalog() {
  const [filters, setFilters] = useState({
    search: "", clasificacion: "all", is_dead: "all", revision: "all",
    usa_catalogo: "all", has_catalog_diff: "all", categoria_online: "all",
    proveedor: "all", stock_status: "all",
  });
  const [sortField, setSortField] = useState("nombre");
  const [sortDir, setSortDir]     = useState("asc");
  const [page, setPage]           = useState(0);
  const [exporting, setExporting] = useState(false);

  const q = buildServerQuery(filters, sortField, sortDir, page);

  // ── Consulta principal (server-side filter + pagination) ────
  const { data: result = { data: [], total: 0 }, isLoading, isFetching } = useQuery({
    queryKey:  ["offers-catalog", q],
    queryFn:   () => base44.entities.Offer.filterPaginated(q.conditions, {
      search:       q.search,
      extraFilters: q.extraFilters,
      orderBy:      q.orderBy,
      limit:        q.limit,
      offset:       q.offset,
    }),
    keepPreviousData: true,
  });

  const offers     = result.data  ?? [];
  const total      = result.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Proveedores (carga única para el dropdown) ──────────────
  const { data: proveedores = [] } = useQuery({
    queryKey: ["offer-proveedores"],
    queryFn:  () => base44.entities.Offer.selectDistinct("proveedor"),
    staleTime: 10 * 60 * 1000,
  });

  // ── Handlers ────────────────────────────────────────────────
  const handleFiltersChange = (f) => { setFilters(f); setPage(0); };
  const handleSort = (field, dir) => { setSortField(field); setSortDir(dir); setPage(0); };

  // ── Export CSV (carga todos los registros filtrados) ─────────
  const exportCSV = async () => {
    setExporting(true);
    try {
      const { data: all } = await base44.entities.Offer.filterPaginated(q.conditions, {
        search:       q.search,
        extraFilters: q.extraFilters,
        orderBy:      q.orderBy,
        limit:        100_000,
        offset:       0,
      });
      const headers = ["codigo", "nombre", "suministrador", "proveedor", "offer_external_id",
                       "precio", "existencia_fisica", "stock_reserva", "stock_tienda",
                       "clasificacion", "is_dead", "revision"];
      const rows = all.map((o) => headers.map((h) => JSON.stringify(o[h] ?? "")).join(","));
      const csv  = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `catalogo_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  if (isLoading && !offers.length) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Catálogo Consolidado</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isFetching && <Loader2 size={10} className="animate-spin" />}
              {total.toLocaleString()} ofertas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={exporting}>
            {exporting
              ? <><Loader2 size={13} className="animate-spin mr-1.5" />Exportando...</>
              : <><Download size={14} className="mr-1.5" />CSV</>
            }
          </Button>
          <ExportExcel offers={offers} filters={filters} />
          <ExportPDF   offers={offers} filters={filters} />
        </div>
      </div>

      {/* Filtros */}
      <CatalogFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        proveedores={proveedores}
      />

      {/* Tabla */}
      <CatalogTable
        offers={offers}
        sortField={sortField}
        sortDir={sortDir}
        onSort={handleSort}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {(page * PAGE_SIZE + 1).toLocaleString()}–{Math.min((page + 1) * PAGE_SIZE, total).toLocaleString()} de {total.toLocaleString()}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              {page + 1} / {totalPages}
            </Badge>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages - 1 || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
