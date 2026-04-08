{
  "name": "Offer",
  "type": "object",
  "properties": {
    "product_id": {
      "type": "string",
      "description": "ID del producto asociado"
    },
    "offer_external_id": {
      "type": "string",
      "description": "id_online / idTienda - llave de cruce entre reportes (opcional si viene vac\u00edo)"
    },
    "tienda_internal_id": {
      "type": "string",
      "description": "Campo tienda del reporte 1 - identificador interno"
    },
    "provider_product_id": {
      "type": "string",
      "description": "ID del reporte 1"
    },
    "codigo": {
      "type": "string",
      "description": "C\u00f3digo del producto"
    },
    "nombre": {
      "type": "string"
    },
    "proveedor": {
      "type": "string"
    },
    "precio": {
      "type": "number"
    },
    "is_dead": {
      "type": "boolean",
      "default": false
    },
    "revision": {
      "type": "boolean",
      "default": false
    },
    "controla_existencia": {
      "type": "boolean",
      "default": true
    },
    "status_provider": {
      "type": "string"
    },
    "has_catalog_diff": {
      "type": "boolean",
      "default": false
    },
    "usa_catalogo": {
      "type": "boolean",
      "default": false
    },
    "available_for_offer": {
      "type": "boolean",
      "default": true
    },
    "temporarily_approved": {
      "type": "boolean",
      "default": false
    },
    "store_min_kontrol": {
      "type": "number"
    },
    "clasificacion": {
      "type": "string",
      "enum": [
        "ambient",
        "chilled",
        "frozen"
      ]
    },
    "canal": {
      "type": "string",
      "default": "normal"
    },
    "catalog_treewupi": {
      "type": "string"
    },
    "catalog_store_treewupi": {
      "type": "string"
    },
    "catalog_created_at": {
      "type": "string"
    },
    "catalog_updated_at": {
      "type": "string"
    },
    "existencia_fisica": {
      "type": "number",
      "default": 0
    },
    "stock_reserva": {
      "type": "number",
      "default": 0
    },
    "stock_tienda": {
      "type": "number",
      "default": 0
    },
    "cantidad_reporte1": {
      "type": "number",
      "default": 0
    },
    "kontrol_reporte1": {
      "type": "number",
      "default": 0
    },
    "fotos": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "marca": {
      "type": "string"
    },
    "suministrador": {
      "type": "string"
    },
    "categoria_online": {
      "type": "string"
    },
    "categoria_almacen": {
      "type": "string"
    },
    "unidad_medida": {
      "type": "string"
    }
  },
  "required": [
    "codigo",
    "proveedor"
  ]
}