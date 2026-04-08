import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

// Columnas esperadas del reporte RESUMEN DESPACHOS
// Fila 0: título; Fila 1: encabezados reales
// #  | Ident. | Codigo | Nombre | Suministrador | Categoría Online | Ordenes | Cantidad P. | Cantidad | P. Costo | Costo Total | P. Venta | Importe | Ganancia

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return 0;
  // Handle Spanish locale: "$ 29,00" → 29.00 (comma = decimal separator)
  // If there's a comma but no dot → comma is decimal separator
  // If there's both (e.g. "1.234,56") → dot is thousands, comma is decimal
  let s = val.toString().trim().replace(/[^0-9.,\-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    // e.g. "1.234,56" → remove dot, replace comma with dot
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    // e.g. "29,00" → replace comma with dot
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export default function SalesIndexImport() {
  const [file, setFile] = useState(null);
  const [period, setPeriod] = useState("");
  const [preview, setPreview] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // sheet_to_json with header:1 returns all rows as arrays
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Find the header row: look for a row containing "Ident." or "Ident" 
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i].map(c => c.toString().toLowerCase());
        if (row.some(c => c.includes("ident"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx === -1) {
        setError("No se encontró la fila de encabezados (se busca columna 'Ident.')");
        return;
      }

      const headers = rows[headerIdx].map(h => (h || "").toString().trim());
      const lh = headers.map(h => h.toLowerCase());

      const idxIdent = lh.findIndex(h => h.includes("ident"));
      const idxCodigo = lh.findIndex(h => h === "codigo" || h === "código");
      const idxNombre = lh.findIndex(h => h === "nombre");
      const idxSumin = lh.findIndex(h => h.includes("suministrador"));
      const idxCatOnline = lh.findIndex(h => h.includes("categoría") || h.includes("categoria") || h.includes("categor"));
      const idxOrdenes = lh.findIndex(h => h.includes("ordenes") || h.includes("órdenes"));
      const idxCantidad = lh.findIndex(h => h === "cantidad");
      const idxCostoTotal = lh.findIndex(h => h.includes("costo total"));
      const idxImporte = lh.findIndex(h => h === "importe");
      const idxGanancia = lh.findIndex(h => h.includes("ganancia"));

      if (idxIdent === -1) {
        setError("No se encontró la columna 'Ident.' en el archivo.");
        return;
      }

      const parsed = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const ident = (row[idxIdent] || "").toString().trim();
        if (!ident || ident === "#") continue;

        parsed.push({
          tienda_internal_id: ident,
          codigo: idxCodigo >= 0 ? (row[idxCodigo] || "").toString().trim() : "",
          nombre: idxNombre >= 0 ? (row[idxNombre] || "").toString().trim() : "",
          suministrador: idxSumin >= 0 ? (row[idxSumin] || "").toString().trim() : "",
          categoria_online: idxCatOnline >= 0 ? (row[idxCatOnline] || "").toString().trim() : "",
          total_ordenes: idxOrdenes >= 0 ? parseNumber(row[idxOrdenes]) : 0,
          total_cantidad: idxCantidad >= 0 ? parseNumber(row[idxCantidad]) : 0,
          costo_total: idxCostoTotal >= 0 ? parseNumber(row[idxCostoTotal]) : 0,
          importe_total: idxImporte >= 0 ? parseNumber(row[idxImporte]) : 0,
          ganancia_total: idxGanancia >= 0 ? parseNumber(row[idxGanancia]) : 0,
        });
      }

      setDataRows(parsed);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsBinaryString(f);
  };

  const handleImport = async () => {
    if (dataRows.length === 0) return;
    if (!period.trim()) {
      setError("El período es obligatorio para mantener el historial. Ejemplo: 2025-01 o Enero 2025");
      return;
    }
    setImporting(true);
    setProgress(5);

    const now = new Date().toISOString();
    const periodLabel = period.trim();
    // Extract YYYY-MM key for deduplication (try to parse, else use label as key)
    const periodoFecha = (() => {
      // Accept formats: "2025-01", "Enero 2025", "enero 2025", "01/2025"
      const iso = periodLabel.match(/^(\d{4})-(\d{2})$/);
      if (iso) return periodLabel;
      const slashFmt = periodLabel.match(/^(\d{2})\/(\d{4})$/);
      if (slashFmt) return `${slashFmt[2]}-${slashFmt[1]}`;
      // month name + year
      const months = { enero:"01",febrero:"02",marzo:"03",abril:"04",mayo:"05",junio:"06",julio:"07",agosto:"08",septiembre:"09",octubre:"10",noviembre:"11",diciembre:"12" };
      const parts = periodLabel.toLowerCase().match(/([a-záéíóúñ]+)\s+(\d{4})/);
      if (parts && months[parts[1]]) return `${parts[2]}-${months[parts[1]]}`;
      return periodLabel; // fallback: use as-is
    })();

    // Aggregate by tienda_internal_id (same product can appear in multiple orders)
    const aggregated = {};
    for (const row of dataRows) {
      const key = row.tienda_internal_id;
      if (!aggregated[key]) {
        aggregated[key] = { ...row };
      } else {
        aggregated[key].total_ordenes += row.total_ordenes;
        aggregated[key].total_cantidad += row.total_cantidad;
        aggregated[key].costo_total += row.costo_total;
        aggregated[key].importe_total += row.importe_total;
        aggregated[key].ganancia_total += row.ganancia_total;
      }
    }

    const records = Object.values(aggregated).map(r => ({
      tienda_internal_id: r.tienda_internal_id,
      codigo: r.codigo,
      nombre: r.nombre,
      suministrador: r.suministrador,
      categoria_online: r.categoria_online,
      total_ordenes: r.total_ordenes,
      total_cantidad: r.total_cantidad,
      costo_total: Math.round(r.costo_total * 100) / 100,
      importe_total: Math.round(r.importe_total * 100) / 100,
      ganancia_total: Math.round(r.ganancia_total * 100) / 100,
      periodo: periodLabel,
      periodo_fecha: periodoFecha,
      imported_at: now,
    }));

    setProgress(20);

    // Only replace records for this exact period_fecha
    const existing = await base44.entities.SalesIndex.filter({ periodo_fecha: periodoFecha });
    if (existing.length > 0) {
      for (let i = 0; i < existing.length; i += 50) {
        const batch = existing.slice(i, i + 50);
        await Promise.all(batch.map(r => base44.entities.SalesIndex.delete(r.id)));
      }
    }

    setProgress(40);

    const BATCH = 50;
    for (let i = 0; i < records.length; i += BATCH) {
      await base44.entities.SalesIndex.bulkCreate(records.slice(i, i + BATCH));
      setProgress(40 + Math.round(((i + BATCH) / records.length) * 55));
    }

    setProgress(100);
    setResult({ total: dataRows.length, unique: records.length, period: periodLabel });
    queryClient.invalidateQueries({ queryKey: ["sales-index"] });
    setImporting(false);
    toast({ title: "Índices importados", description: `${records.length} productos con índices de ventas.` });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="text-primary" size={24} />
          Importar Índices de Ventas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Carga el reporte <strong>RESUMEN DESPACHOS - Productos</strong>. Los índices se cotejan por ID de tienda con el catálogo interno.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Período (etiqueta)</label>
          <Input
            placeholder="Ej: 2025-01 o Enero 2025"
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setError(null); }}
            className="w-64"
          />
          <p className="text-xs text-muted-foreground mt-1">Obligatorio. Permite crear historial acumulado. Mismo período = reemplaza ese mes.</p>
        </div>

        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Selecciona el archivo Excel de despachos</p>
          <p className="text-xs text-muted-foreground">RESUMEN DESPACHOS - Productos (.xlsx)</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {file && (
          <div className="flex items-center gap-2 text-sm">
            <FileText size={15} className="text-primary" />
            <span className="font-medium">{file.name}</span>
            {dataRows.length > 0 && <Badge variant="secondary">{dataRows.length} filas leídas · {Object.keys(
              dataRows.reduce((a, r) => { a[r.tienda_internal_id] = 1; return a; }, {})
            ).length} productos únicos</Badge>}
          </div>
        )}

        {error && <div className="flex items-center gap-2 text-destructive text-sm"><AlertCircle size={14} />{error}</div>}

        {preview.length > 0 && (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-3 py-2 text-left font-medium">ID Tienda</th>
                  <th className="px-3 py-2 text-left font-medium">Nombre</th>
                  <th className="px-3 py-2 text-right font-medium">Órdenes</th>
                  <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                  <th className="px-3 py-2 text-right font-medium">Importe</th>
                  <th className="px-3 py-2 text-right font-medium">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-1.5 font-mono text-primary">{r.tienda_internal_id}</td>
                    <td className="px-3 py-1.5 max-w-[200px] truncate">{r.nombre}</td>
                    <td className="px-3 py-1.5 text-right">{r.total_ordenes}</td>
                    <td className="px-3 py-1.5 text-right">{r.total_cantidad}</td>
                    <td className="px-3 py-1.5 text-right">${r.importe_total.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right text-success">${r.ganancia_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {importing && (
          <div className="space-y-1.5">
            <Progress value={progress} />
            <p className="text-xs text-center text-muted-foreground">Importando... {progress}%</p>
          </div>
        )}

        {result && (
          <div className="bg-success/10 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-success font-semibold">
              <CheckCircle2 size={18} /> Importación completada — {result.period}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Filas leídas:</span> <strong>{result.total}</strong></div>
              <div><span className="text-muted-foreground">Productos únicos:</span> <strong>{result.unique}</strong></div>
            </div>
          </div>
        )}

        {dataRows.length > 0 && !importing && !result && (
          <Button onClick={handleImport} className="w-full">
            <Upload size={15} className="mr-2" />
            Importar {dataRows.length} registros → {Object.keys(
              dataRows.reduce((a, r) => { a[r.tienda_internal_id] = 1; return a; }, {})
            ).length} productos únicos
          </Button>
        )}
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">¿Cómo funciona el cruce?</p>
        <p>• El archivo debe tener la columna <strong>Ident.</strong> con el ID de la tienda.</p>
        <p>• Los productos del catálogo que tengan ese mismo <strong>ID de tienda</strong> mostrarán sus índices de ventas.</p>
        <p>• Productos sin ID de tienda aparecerán como <strong>"Producto nuevo sin ventas"</strong>.</p>
        <p>• Cada importación <strong>reemplaza</strong> los índices anteriores.</p>
      </div>
    </div>
  );
}