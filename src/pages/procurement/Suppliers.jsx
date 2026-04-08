import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Search, Edit2, Trash2, Building2, Phone, Mail, Globe, ToggleLeft, ToggleRight } from "lucide-react";
import { useProcurementUser } from "@/hooks/useProcurementUser";

const EMPTY_FORM = {
  name: "", code: "", contact_name: "", email: "", phone: "",
  address: "", country: "", tax_id: "", default_currency: "USD",
  default_exchange_rate: 1, default_lead_time_days: "", default_min_qty: 1,
  default_pack_multiple: 1, payment_terms: "", notes: "", is_active: true,
};

export default function Suppliers() {
  const { isAdmin } = useProcurementUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // supplier object being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showDeleteId, setShowDeleteId] = useState(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("name", 500),
  });

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    return !q || (s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q) || (s.contact_name || "").toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "", code: s.code || "", contact_name: s.contact_name || "",
      email: s.email || "", phone: s.phone || "", address: s.address || "",
      country: s.country || "", tax_id: s.tax_id || "",
      default_currency: s.default_currency || "USD",
      default_exchange_rate: s.default_exchange_rate || 1,
      default_lead_time_days: s.default_lead_time_days || "",
      default_min_qty: s.default_min_qty || 1,
      default_pack_multiple: s.default_pack_multiple || 1,
      payment_terms: s.payment_terms || "", notes: s.notes || "",
      is_active: s.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast({ title: "El nombre es obligatorio", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      ...form,
      default_exchange_rate: parseFloat(form.default_exchange_rate) || 1,
      default_lead_time_days: form.default_lead_time_days !== "" ? parseInt(form.default_lead_time_days) : undefined,
      default_min_qty: parseFloat(form.default_min_qty) || 1,
      default_pack_multiple: parseFloat(form.default_pack_multiple) || 1,
    };
    if (editing) {
      await base44.entities.Supplier.update(editing.id, payload);
      toast({ title: "Proveedor actualizado" });
    } else {
      await base44.entities.Supplier.create(payload);
      toast({ title: "Proveedor creado" });
    }
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Supplier.delete(id);
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    setShowDeleteId(null);
    toast({ title: "Proveedor eliminado" });
  };

  const toggleActive = async (s) => {
    await base44.entities.Supplier.update(s.id, { is_active: !s.is_active });
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };

  const Field = ({ label, name, type = "text", placeholder = "" }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        placeholder={placeholder}
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Proveedores</h1>
            <p className="text-xs text-muted-foreground">{filtered.length} registrado(s)</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={15} className="mr-1.5" /> Nuevo Proveedor
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 size={32} className="mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay proveedores registrados.</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(s => (
            <Card key={s.id} className={`p-4 ${!s.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{s.name}</span>
                    {s.code && <Badge variant="secondary" className="text-[10px]">{s.code}</Badge>}
                    <Badge variant={s.is_active ? "default" : "outline"} className="text-[10px]">
                      {s.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {s.contact_name && <span className="flex items-center gap-1"><Building2 size={10} /> {s.contact_name}</span>}
                    {s.email && <span className="flex items-center gap-1"><Mail size={10} /> {s.email}</span>}
                    {s.phone && <span className="flex items-center gap-1"><Phone size={10} /> {s.phone}</span>}
                    {s.country && <span className="flex items-center gap-1"><Globe size={10} /> {s.country}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span>{s.default_currency || "USD"} · TC: ×{s.default_exchange_rate || 1}</span>
                    {s.default_lead_time_days && <span>Entrega: {s.default_lead_time_days}d</span>}
                    {s.payment_terms && <span>Pago: {s.payment_terms}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleActive(s)}>
                      {s.is_active ? <ToggleRight size={15} className="text-success" /> : <ToggleLeft size={15} className="text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                      <Edit2 size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-destructive" onClick={() => setShowDeleteId(s.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                )}
              </div>
              {s.notes && <p className="text-[10px] text-muted-foreground mt-2 italic">{s.notes}</p>}
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *" name="name" placeholder="Nombre del proveedor" />
              <Field label="Código interno" name="code" placeholder="PROV-001" />
              <Field label="Contacto" name="contact_name" placeholder="Nombre del contacto" />
              <Field label="Email" name="email" type="email" placeholder="proveedor@email.com" />
              <Field label="Teléfono" name="phone" placeholder="+1 555 000 0000" />
              <Field label="País" name="country" placeholder="Cuba, España..." />
              <Field label="Dirección" name="address" placeholder="Dirección física" />
              <Field label="RIF / NIF / ID Fiscal" name="tax_id" placeholder="J-12345678-0" />
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Condiciones comerciales por defecto</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="Moneda" name="default_currency" placeholder="USD" />
                <Field label="Tasa de cambio" name="default_exchange_rate" type="number" placeholder="1" />
                <Field label="Días de entrega" name="default_lead_time_days" type="number" placeholder="7" />
                <Field label="Cantidad mínima" name="default_min_qty" type="number" placeholder="1" />
                <Field label="Múltiplo de compra" name="default_pack_multiple" type="number" placeholder="1" />
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Términos de pago</Label>
                  <Input placeholder="30 días, contado..." value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas</Label>
              <Input placeholder="Observaciones del proveedor..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
              <Label htmlFor="is_active" className="text-xs cursor-pointer">Proveedor activo</Label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : editing ? "Actualizar" : "Crear Proveedor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!showDeleteId} onOpenChange={() => setShowDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>¿Eliminar proveedor?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. Las ofertas y pedidos vinculados a este proveedor no serán eliminados.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(showDeleteId)}>Eliminar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}