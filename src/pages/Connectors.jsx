import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Plug, Plus, Pencil, Trash2, RefreshCw, CheckCircle2, XCircle,
  Clock, Globe, HardDrive, Info, Play, Upload
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TYPE_LABELS = {
  http_endpoint: { label: "HTTP / REST", icon: Globe },
  ftp: { label: "FTP", icon: HardDrive },
  sftp: { label: "SFTP", icon: HardDrive },
  local_path: { label: "Ruta Local", icon: HardDrive },
};

const SCHEDULE_LABELS = {
  manual: "Manual",
  hourly: "Cada hora",
  every_6h: "Cada 6 horas",
  every_12h: "Cada 12 horas",
  daily: "Diario",
};

const REPORT_LABELS = {
  reporte_almacen: "Almacén",
  reporte_submayor: "Submayor",
  ambos: "Ambos",
};

const STATUS_CONFIG = {
  success: { label: "OK", color: "text-success", icon: CheckCircle2 },
  error: { label: "Error", color: "text-destructive", icon: XCircle },
  pending: { label: "Pendiente", color: "text-warning", icon: Clock },
  never: { label: "Nunca ejecutado", color: "text-muted-foreground", icon: Clock },
};

const EMPTY_FORM = {
  name: "", type: "http_endpoint", report_type: "reporte_almacen",
  url_or_path: "", auth_header: "", ftp_host: "", ftp_port: 21,
  ftp_user: "", ftp_password: "", ftp_remote_path: "",
  schedule: "manual", is_active: false, notes: ""
};

export default function Connectors() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: connectors = [], isLoading } = useQuery({
    queryKey: ["connectors"],
    queryFn: () => base44.entities.Connector.list("-created_date", 100),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["connectors"] });

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY_FORM, ...c }); setOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.type || !form.report_type) {
      toast({ title: "Campos requeridos", description: "Nombre, tipo y reporte son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      await base44.entities.Connector.update(editing.id, form);
      toast({ title: "Conector actualizado" });
    } else {
      await base44.entities.Connector.create({ ...form, last_run_status: "never" });
      toast({ title: "Conector creado" });
    }
    refresh();
    setOpen(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Connector.delete(id);
    refresh();
    toast({ title: "Conector eliminado" });
  };

  const toggleActive = async (c) => {
    await base44.entities.Connector.update(c.id, { is_active: !c.is_active });
    refresh();
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plug size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Conectores de Importación</h1>
            <p className="text-xs text-muted-foreground">
              Configura fuentes externas para importar reportes automáticamente
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus size={14} className="mr-1.5" /> Nuevo Conector
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-info/5 border border-info/20 rounded-lg p-3 flex gap-3">
        <Info size={16} className="text-info flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">¿Cómo ejecutar un conector manualmente?</span> — Haz clic en <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 rounded font-medium"><Play size={10} /> Ejecutar</span> en el conector deseado. Esto te llevará a la página de importación con el tipo de reporte preseleccionado, donde podrás subir el archivo JSON correspondiente.</p>
          <p className="text-muted-foreground/70">La ejecución automática programada (según el horario) requiere funciones backend — disponible en el plan Builder+.</p>
        </div>
      </div>

      {/* Connector list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : connectors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Plug size={32} className="text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No hay conectores configurados.</p>
            <Button size="sm" variant="outline" onClick={openNew}>
              <Plus size={14} className="mr-1.5" /> Crear primer conector
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {connectors.map((c) => {
            const TypeIcon = TYPE_LABELS[c.type]?.icon || Globe;
            const status = STATUS_CONFIG[c.last_run_status || "never"];
            const StatusIcon = status.icon;
            return (
              <Card key={c.id} className={`transition-all ${!c.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <TypeIcon size={18} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm">{c.name}</h3>
                      <Badge variant="secondary" className="text-xs">{TYPE_LABELS[c.type]?.label}</Badge>
                      <Badge variant="outline" className="text-xs">{REPORT_LABELS[c.report_type]}</Badge>
                      <Badge variant="outline" className="text-xs">{SCHEDULE_LABELS[c.schedule]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.url_or_path || c.ftp_host || c.notes || "Sin ruta configurada"}
                    </p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${status.color}`}>
                      <StatusIcon size={11} />
                      <span>{status.label}</span>
                      {c.last_run_at && (
                        <span className="text-muted-foreground ml-1">
                          — {new Date(c.last_run_at).toLocaleString("es-ES")}
                        </span>
                      )}
                      {c.last_run_message && (
                        <span className="text-muted-foreground truncate max-w-[200px]">: {c.last_run_message}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.is_active ? "Activo" : "Inactivo"}</span>
                      <Switch checked={!!c.is_active} onCheckedChange={() => toggleActive(c)} />
                    </div>
                    <Link to={`${createPageUrl("DataImport")}?report_type=${c.report_type}`}>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <Play size={12} /> Ejecutar
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conector" : "Nuevo Conector"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nombre *</Label>
                <Input placeholder="Ej: API Almacén Principal" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tipo de conector *</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo de reporte *</Label>
                <Select value={form.report_type} onValueChange={(v) => set("report_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* HTTP fields */}
            {(form.type === "http_endpoint" || form.type === "local_path") && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>{form.type === "local_path" ? "Ruta del archivo" : "URL del endpoint"}</Label>
                  <Input
                    placeholder={form.type === "local_path" ? "/data/reportes/almacen.json" : "https://api.ejemplo.com/reportes"}
                    value={form.url_or_path}
                    onChange={(e) => set("url_or_path", e.target.value)}
                  />
                </div>
                {form.type === "http_endpoint" && (
                  <div className="space-y-1">
                    <Label>Header de autenticación</Label>
                    <Input placeholder="Bearer eyJhbGciOi..." value={form.auth_header} onChange={(e) => set("auth_header", e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* FTP/SFTP fields */}
            {(form.type === "ftp" || form.type === "sftp") && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Host</Label>
                  <Input placeholder="ftp.ejemplo.com" value={form.ftp_host} onChange={(e) => set("ftp_host", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Puerto</Label>
                  <Input type="number" value={form.ftp_port} onChange={(e) => set("ftp_port", Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label>Usuario</Label>
                  <Input value={form.ftp_user} onChange={(e) => set("ftp_user", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Contraseña</Label>
                  <Input type="password" value={form.ftp_password} onChange={(e) => set("ftp_password", e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Ruta remota del archivo</Label>
                  <Input placeholder="/reportes/almacen.json" value={form.ftp_remote_path} onChange={(e) => set("ftp_remote_path", e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frecuencia de ejecución</Label>
                <Select value={form.schedule} onValueChange={(v) => set("schedule", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <Switch checked={!!form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                <Label>Conector activo</Label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Input placeholder="Observaciones opcionales..." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear Conector"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}