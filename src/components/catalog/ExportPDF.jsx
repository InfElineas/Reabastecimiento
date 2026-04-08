import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

const COLS = [
  { header: "Código",       key: "codigo",           w: 22 },
  { header: "Nombre",       key: "nombre",            w: 50 },
  { header: "Marca",        key: "marca",             w: 22 },
  { header: "Proveedor",    key: "proveedor",         w: 28 },
  { header: "ID Online",    key: "offer_external_id", w: 22 },
  { header: "Precio",       key: "precio",            w: 18, fmt: (v) => v != null ? `$${Number(v).toFixed(2)}` : "-" },
  { header: "Exist.",       key: "existencia_fisica", w: 13, align: "right" },
  { header: "Reserva",      key: "stock_reserva",     w: 13, align: "right" },
  { header: "Tienda",       key: "stock_tienda",      w: 13, align: "right" },
  { header: "Clasif.",      key: "clasificacion",     w: 16 },
  { header: "Dead",         key: "is_dead",           w: 10, fmt: (v) => v ? "Sí" : "No", align: "center" },
  { header: "Rev.",         key: "revision",          w: 10, fmt: (v) => v ? "Sí" : "No", align: "center" },
];

function drawTable(doc, data, startY, pageHeight, pageWidth) {
  const marginL = 10;
  const rowH = 6;
  const headerH = 7;
  let y = startY;

  const drawHeader = (yPos) => {
    doc.setFillColor(52, 73, 94);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    let x = marginL;
    COLS.forEach((col) => {
      doc.rect(x, yPos, col.w, headerH, "F");
      doc.text(col.header, x + 1, yPos + 4.5);
      x += col.w;
    });
    return yPos + headerH;
  };

  y = drawHeader(y);

  doc.setFont("helvetica", "normal");
  data.forEach((row, i) => {
    if (y + rowH > pageHeight - 12) {
      doc.addPage();
      y = 12;
      y = drawHeader(y);
    }
    const fill = i % 2 === 0;
    if (fill) {
      doc.setFillColor(245, 247, 250);
    }
    let x = marginL;
    doc.setTextColor(33, 37, 41);
    doc.setFontSize(6.5);
    COLS.forEach((col) => {
      if (fill) doc.rect(x, y, col.w, rowH, "F");
      let val = row[col.key];
      if (col.fmt) val = col.fmt(val);
      else if (val == null || val === "") val = "-";
      else val = String(val);
      if (val.length > col.w / 1.8) val = val.substring(0, Math.floor(col.w / 1.8)) + "…";
      const textX = col.align === "right" ? x + col.w - 1.5 : col.align === "center" ? x + col.w / 2 : x + 1;
      doc.text(val, textX, y + 4, { align: col.align === "right" ? "right" : col.align === "center" ? "center" : "left" });
      x += col.w;
    });
    // row border
    doc.setDrawColor(220, 224, 230);
    doc.line(marginL, y + rowH, marginL + COLS.reduce((s, c) => s + c.w, 0), y + rowH);
    y += rowH;
  });

  return y;
}

export default function ExportPDF({ offers, filters }) {
  const [exporting, setExporting] = useState(false);

  const generatePDF = () => {
    setExporting(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Title
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33, 37, 41);
        doc.text("Reporte de Catálogo de Productos", 10, 13);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 110, 120);
        doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, 10, 19);
        doc.text(`Total registros: ${offers.length}`, 10, 24);

        // Filters
        const activeFilters = [];
        if (filters.search) activeFilters.push(`Búsqueda: "${filters.search}"`);
        if (filters.clasificacion !== "all") activeFilters.push(`Clasificación: ${filters.clasificacion}`);
        if (filters.is_dead !== "all") activeFilters.push(`Estado: ${filters.is_dead === "active" ? "Activo" : "Dead"}`);
        if (filters.revision !== "all") activeFilters.push(`Revisión: ${filters.revision === "yes" ? "Sí" : "No"}`);
        if (filters.proveedor !== "all") activeFilters.push(`Proveedor: ${filters.proveedor}`);
        if (filters.stock_status !== "all") {
          const labels = { in_stock: "En stock", no_stock: "Sin stock", reserva_only: "Solo reserva" };
          activeFilters.push(`Stock: ${labels[filters.stock_status]}`);
        }

        let yMeta = 29;
        doc.setFontSize(7.5);
        if (activeFilters.length > 0) {
          doc.setTextColor(52, 73, 94);
          doc.text("Filtros: " + activeFilters.join("  |  "), 10, yMeta);
          yMeta += 5;
        } else {
          doc.setTextColor(120, 130, 140);
          doc.text("Sin filtros aplicados", 10, yMeta);
          yMeta += 5;
        }

        // Table
        drawTable(doc, offers, yMeta + 1, pageHeight, pageWidth);

        // Footer on all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.setFontSize(7);
          doc.setTextColor(160);
          doc.text("Control de Inventario — Ventas Online", 10, pageHeight - 6);
          doc.text(`Página ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 6, { align: "center" });
        }

        doc.save(`catalogo_${new Date().toISOString().split("T")[0]}.pdf`);
      } catch (err) {
        console.error("Error generando PDF:", err);
      } finally {
        setExporting(false);
      }
    }, 50);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generatePDF}
      disabled={exporting || offers.length === 0}
    >
      {exporting ? (
        <><Loader2 size={14} className="mr-1.5 animate-spin" /> Generando...</>
      ) : (
        <><FileText size={14} className="mr-1.5" /> Exportar PDF</>
      )}
    </Button>
  );
}