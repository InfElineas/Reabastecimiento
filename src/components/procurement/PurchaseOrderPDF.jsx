import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const BRAND = {
  primary: [30, 80, 180],
  dark: [20, 30, 60],
  gray: [100, 110, 130],
  lightGray: [240, 242, 247],
  white: [255, 255, 255],
};

function line(doc, y, margin = 14) {
  doc.setDrawColor(...BRAND.lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, 210 - margin, y);
}

export function generatePurchaseOrderPDF(order, items, companyData = {}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 14;
  let y = 0;

  const company = {
    name: companyData.name || "Control de Inventario S.A.",
    address: companyData.address || "Dirección de la empresa",
    tax_id: companyData.tax_id || "RIF: J-00000000-0",
    phone: companyData.phone || "",
    email: companyData.email || "",
  };

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, W, 38, "F");

  // Logo placeholder circle
  doc.setFillColor(255, 255, 255, 0.25);
  doc.setFillColor(60, 110, 210);
  doc.roundedRect(margin, 6, 26, 26, 3, 3, "F");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("CI", margin + 13, 22, { align: "center" });

  // Company name
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(company.name, margin + 30, 16);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text([company.address, company.tax_id, [company.phone, company.email].filter(Boolean).join("  ·  ")].filter(Boolean), margin + 30, 22);

  // "ORDEN DE COMPRA" label right side
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ORDEN DE COMPRA", W - margin, 15, { align: "right" });
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const orderNum = `#${(order.order_number || order.id?.slice(-8)?.toUpperCase())}`;
  doc.text(orderNum, W - margin, 22, { align: "right" });
  const createdStr = order.created_date
    ? format(new Date(order.created_date), "dd/MM/yyyy", { locale: es })
    : "";
  doc.text(`Fecha: ${createdStr}`, W - margin, 27, { align: "right" });

  y = 44;

  // ── Supplier + Order Info boxes ──────────────────────────────
  const boxH = 34;
  // Supplier box
  doc.setFillColor(...BRAND.lightGray);
  doc.roundedRect(margin, y, 88, boxH, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("PROVEEDOR", margin + 4, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.dark);
  doc.text(order.supplier_name || "—", margin + 4, y + 13);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  if (order.supplier_contact) doc.text(`Contacto: ${order.supplier_contact}`, margin + 4, y + 19);
  if (order.supplier_email) doc.text(`Email: ${order.supplier_email}`, margin + 4, y + 24);
  if (order.supplier_address) doc.text(order.supplier_address, margin + 4, y + 29);

  // Order info box
  const infoX = margin + 92;
  doc.setFillColor(...BRAND.lightGray);
  doc.roundedRect(infoX, y, 88 + 16, boxH, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.primary);
  doc.text("DATOS DEL PEDIDO", infoX + 4, y + 6);

  const rows = [
    ["Estado:", order.status?.replace(/_/g, " ")?.toUpperCase() || "—"],
    ["Moneda:", `${order.currency || "USD"}${order.exchange_rate && order.exchange_rate !== 1 ? ` (TC: ×${order.exchange_rate})` : ""}`],
    ["Oferta origen:", order.offer_name || "—"],
    ["Creado por:", order.created_by || "—"],
    ["Aprobado por:", order.confirmed_by || "—"],
  ];
  rows.forEach(([label, val], i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.gray);
    doc.text(label, infoX + 4, y + 13 + i * 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.dark);
    doc.text(String(val), infoX + 32, y + 13 + i * 5);
  });

  y += boxH + 8;

  // ── Items table ──────────────────────────────────────────────
  const cols = [
    { header: "#", w: 8, align: "center" },
    { header: "Código", w: 20 },
    { header: "Producto / Descripción", w: 62 },
    { header: "Unid.", w: 12, align: "center" },
    { header: "Cant.", w: 14, align: "right" },
    { header: "Precio Unit.", w: 22, align: "right" },
    { header: "Subtotal", w: 26, align: "right" },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableStartX = (W - tableW) / 2;

  // Header row
  doc.setFillColor(...BRAND.primary);
  doc.rect(tableStartX, y, tableW, 8, "F");
  let cx = tableStartX;
  cols.forEach(col => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    const textX = col.align === "right" ? cx + col.w - 2 : col.align === "center" ? cx + col.w / 2 : cx + 2;
    doc.text(col.header, textX, y + 5.5, { align: col.align || "left" });
    cx += col.w;
  });
  y += 8;

  // Item rows
  const includedItems = items.filter(i => i.status !== "excluded");
  let totalAmount = 0;
  includedItems.forEach((item, idx) => {
    const rowH = 7;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 252);
      doc.rect(tableStartX, y, tableW, rowH, "F");
    }
    cx = tableStartX;
    const rowData = [
      { val: String(idx + 1), align: "center" },
      { val: item.internal_product_code || "—" },
      { val: item.product_name || item.supplier_product_name || "—" },
      { val: item.unit || "—", align: "center" },
      { val: String(item.final_qty ?? 0), align: "right" },
      { val: `${item.currency || order.currency || "USD"} ${(item.unit_cost || 0).toFixed(2)}`, align: "right" },
      { val: `${item.currency || order.currency || "USD"} ${(item.subtotal || 0).toFixed(2)}`, align: "right" },
    ];
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.dark);
    cols.forEach((col, ci) => {
      const rd = rowData[ci];
      const align = rd.align || col.align || "left";
      const textX = align === "right" ? cx + col.w - 2 : align === "center" ? cx + col.w / 2 : cx + 2;
      // Truncate long text
      let val = rd.val;
      if (align === "left" && doc.getTextWidth(val) > col.w - 3) {
        while (doc.getTextWidth(val + "...") > col.w - 3 && val.length > 0) val = val.slice(0, -1);
        val += "...";
      }
      doc.text(val, textX, y + 4.8, { align });
      cx += col.w;
    });
    totalAmount += item.subtotal || 0;

    // Override indicator
    if (item.suggested_qty !== item.final_qty && item.suggested_qty != null) {
      doc.setFontSize(6);
      doc.setTextColor(...BRAND.primary);
      doc.text("⚑", tableStartX + cols[0].w + cols[1].w + cols[2].w - 4, y + 4.8);
    }

    y += rowH;

    // New page if needed
    if (y > 265) {
      doc.addPage();
      y = 14;
    }
  });

  // Total row
  line(doc, y, tableStartX);
  y += 2;
  doc.setFillColor(...BRAND.dark);
  doc.rect(tableStartX + tableW - 48, y, 48, 9, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL:", tableStartX + tableW - 46, y + 6.5);
  doc.text(`${order.currency || "USD"} ${totalAmount.toFixed(2)}`, tableStartX + tableW - 2, y + 6.5, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.gray);
  doc.text(`${includedItems.length} producto(s) incluido(s)`, tableStartX, y + 6.5);
  y += 18;

  // ── Notes ────────────────────────────────────────────────────
  if (order.notes) {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text("OBSERVACIONES:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.dark);
    const noteLines = doc.splitTextToSize(order.notes, W - margin * 2);
    doc.text(noteLines, margin, y + 5);
    y += 5 + noteLines.length * 4 + 6;
  }

  // ── Signature section ────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }
  y = Math.max(y, 220);

  line(doc, y);
  y += 8;

  const sigBoxW = 58;
  const sigBoxH = 22;
  const sigGap = 8;
  const totalSigW = sigBoxW * 3 + sigGap * 2;
  const sigStartX = (W - totalSigW) / 2;

  const sigs = [
    { label: "Elaborado por", name: order.created_by?.split("@")[0] || "Comercial" },
    { label: "Revisado y Aprobado por", name: order.confirmed_by?.split("@")[0] || "Supervisor" },
    { label: "Firma del Proveedor", name: order.supplier_name || "Proveedor" },
  ];

  sigs.forEach((sig, i) => {
    const sx = sigStartX + i * (sigBoxW + sigGap);
    doc.setDrawColor(...BRAND.gray);
    doc.setLineWidth(0.3);
    doc.rect(sx, y, sigBoxW, sigBoxH);
    // Signature line
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.5);
    doc.line(sx + 6, y + sigBoxH - 8, sx + sigBoxW - 6, y + sigBoxH - 8);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.primary);
    doc.text(sig.label.toUpperCase(), sx + sigBoxW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(sig.name, sx + sigBoxW / 2, y + sigBoxH - 2, { align: "center" });
  });

  y += sigBoxH + 6;

  // Footer
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 295, W, 6, "F");
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })} · Documento interno — ${company.name}`, W / 2, 297.5, { align: "center" });

  doc.save(`Pedido-${(order.order_number || order.id?.slice(-8))?.toUpperCase()}.pdf`);
}