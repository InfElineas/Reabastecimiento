import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Image, Package, BarChart2, Info } from "lucide-react";

const FieldRow = ({ source, target, note, isPhoto }) => (
  <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-primary flex-1">{source}</code>
    <span className="text-muted-foreground text-xs">→</span>
    <code className="text-xs bg-accent/10 px-2 py-0.5 rounded font-mono text-accent flex-1">{target}</code>
    {note && <span className="text-xs text-muted-foreground hidden sm:block">{note}</span>}
    {isPhoto && <Image size={12} className="text-accent flex-shrink-0" />}
  </div>
);

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h4>
    <div className="bg-card border border-border rounded-lg px-4">{children}</div>
  </div>
);

export default function ImportConfig() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Importación</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Mapeo de campos para los reportes JSON de almacén y submayor.
        </p>
      </div>

      <Tabs defaultValue="almacen">
        <TabsList className="mb-4">
          <TabsTrigger value="almacen" className="gap-2">
            <Package size={14} /> Reporte Almacén / Oferta
          </TabsTrigger>
          <TabsTrigger value="submayor" className="gap-2">
            <BarChart2 size={14} /> Reporte Submayor / Inventario
          </TabsTrigger>
        </TabsList>

        {/* ────────────── ALMACEN ────────────── */}
        <TabsContent value="almacen" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package size={16} className="text-primary" />
                Reporte de Almacén — Producto y Oferta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Cada objeto del array crea/actualiza un <strong>Producto</strong> y su <strong>Oferta</strong> asociada.
                La llave de cruce para Producto es <code className="text-xs bg-muted px-1 rounded">codigo</code> y para Oferta es <code className="text-xs bg-muted px-1 rounded">id_online</code> (si está vacío, se usa <code className="text-xs bg-muted px-1 rounded">codigo + proveedor</code>).
              </p>
            </CardHeader>
            <CardContent className="space-y-0">
              <Section title="Campos raíz del objeto">
                <FieldRow source="id" target="Offer.provider_product_id" note="ID interno del proveedor" />
                <FieldRow source="id_online" target="Offer.offer_external_id" note="Llave de cruce principal" />
                <FieldRow source="tienda" target="Offer.tienda_internal_id" note="ID de la oferta en tienda" />
                <FieldRow source="codigo" target="Product.codigo / Offer.codigo" note="Llave de cruce Producto" />
                <FieldRow source="nombre" target="Product.nombre / Offer.nombre" />
                <FieldRow source="suministrador" target="Product.suministrador / Offer.suministrador" />
                <FieldRow source="marca" target="Product.marca / Offer.marca" />
                <FieldRow source="proveedor" target="Offer.proveedor" />
                <FieldRow source="precio" target="Offer.precio" />
                <FieldRow source="categoria_online" target="Product.categoria_online / Offer.categoria_online" />
                <FieldRow source="categoria_almacen" target="Product.categoria_almacen / Offer.categoria_almacen" />
                <FieldRow source="unidad_medida" target="Product.unidad_medida / Offer.unidad_medida" />
                <FieldRow source="unidad_compra" target="Product.unidad_compra" />
                <FieldRow source="peso" target="Product.peso_lb" />
                <FieldRow source="cantidad" target="Offer.cantidad_reporte1" />
                <FieldRow source="kontrol" target="Offer.kontrol_reporte1" />
                <FieldRow source="isDead" target="Offer.is_dead" />
                <FieldRow source="revision" target="Offer.revision" />
                <FieldRow source="controla_existencia" target="Offer.controla_existencia" />
                <FieldRow source="statusProvider" target="Offer.status_provider" />
                <FieldRow source="has_catalog_diff" target="Offer.has_catalog_diff" />
                <FieldRow source="clasificacion" target="Offer.clasificacion" note="ambient / chilled / frozen" />
                <FieldRow source="canal" target="Offer.canal" />
                <FieldRow source="store_min_kontrol" target="Offer.store_min_kontrol" />
              </Section>

              <Section title="Objeto catalogo (anidado)">
                <FieldRow source="catalogo.descripcion / productDescription" target="Product.descripcion" />
                <FieldRow source="catalogo.gtin" target="Product.gtin" />
                <FieldRow source="catalogo.brandName" target="Product.marca / Offer.marca" note="Prioridad sobre marca raíz" />
                <FieldRow source="catalogo.netContent[0].value" target="Product.net_content_value" note="Array de objetos {value, unitCode}" />
                <FieldRow source="catalogo.netContent[0].unitCode" target="Product.net_content_unit" />
                <FieldRow source="catalogo.treewupi" target="Offer.catalog_treewupi" />
                <FieldRow source="catalogo.storeTreewupi" target="Offer.catalog_store_treewupi" />
                <FieldRow source="catalogo.created" target="Offer.catalog_created_at" />
                <FieldRow source="catalogo.updated" target="Offer.catalog_updated_at" />
                <FieldRow source="catalogo.usaCatalogo" target="Offer.usa_catalogo" />
                <FieldRow source="catalogo.availableForOffer" target="Offer.available_for_offer" />
                <FieldRow source="catalogo.temporarilyApproved" target="Offer.temporarily_approved" />
                <FieldRow
                  source='catalogo.fotos[*].foto  →  ["url1","url2",...]'
                  target="Product.fotos / Offer.fotos"
                  note="Array de objetos {foto: url}"
                  isPhoto
                />
              </Section>

              <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 flex gap-3 mt-2">
                <CheckCircle size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-accent">Fotos configuradas correctamente</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Las URLs se extraen del campo <code className="bg-muted px-1 rounded">foto</code> dentro de cada objeto del array <code className="bg-muted px-1 rounded">catalogo.fotos</code>.
                    Se guardan como array de strings en <code className="bg-muted px-1 rounded">Product.fotos</code> y <code className="bg-muted px-1 rounded">Offer.fotos</code>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────── SUBMAYOR ────────────── */}
        <TabsContent value="submayor" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart2 size={16} className="text-primary" />
                Reporte Submayor — Inventario
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Actualiza stocks de <strong>Ofertas existentes</strong> y genera un <strong>InventorySnapshot</strong>.
                La llave de cruce es <code className="text-xs bg-muted px-1 rounded">idTienda</code> → <code className="text-xs bg-muted px-1 rounded">Offer.offer_external_id</code> (si está vacío, se usa <code className="text-xs bg-muted px-1 rounded">codigo + proveedor</code>).
              </p>
            </CardHeader>
            <CardContent>
              <Section title="Mapeo de campos">
                <FieldRow source="idTienda" target="Offer (llave de cruce: offer_external_id)" note="Campo obligatorio" />
                <FieldRow source="existencia_fisica" target="Offer.existencia_fisica + Snapshot.existencia_fisica" />
                <FieldRow source="almacen" target="Offer.stock_reserva + Snapshot.stock_reserva" />
                <FieldRow source="tienda" target="Offer.stock_tienda + Snapshot.stock_tienda" />
                <FieldRow source="precio" target="Offer.precio + Snapshot.precio" note="Solo si viene en el registro" />
              </Section>

              <Section title="Campos generados automáticamente (Snapshot)">
                <FieldRow source="(auto)" target="Snapshot.offer_id" note="ID de la oferta encontrada" />
                <FieldRow source="(auto)" target="Snapshot.snapshot_at" note="Timestamp del momento de importación" />
                <FieldRow source="(de Offer)" target="Snapshot.cantidad_reporte1" note="Copiado de la oferta existente" />
                <FieldRow source="(de Offer)" target="Snapshot.kontrol_reporte1" note="Copiado de la oferta existente" />
              </Section>

              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 flex gap-3 mt-2">
                <Info size={16} className="text-warning flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Validación de inconsistencia</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Se genera una advertencia si <code className="bg-muted px-1 rounded">existencia_fisica ≠ almacen + tienda</code>.
                    Los registros sin oferta asociada en el sistema se reportan como advertencias y se omiten.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}