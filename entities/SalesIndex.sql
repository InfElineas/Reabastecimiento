{
  "name": "SalesIndex",
  "type": "object",
  "properties": {
    "tienda_internal_id": {
      "type": "string",
      "description": "ID de tienda (Ident.) - clave de cruce con Offer.tienda_internal_id"
    },
    "codigo": {
      "type": "string"
    },
    "nombre": {
      "type": "string"
    },
    "suministrador": {
      "type": "string"
    },
    "categoria_online": {
      "type": "string"
    },
    "total_ordenes": {
      "type": "number",
      "default": 0
    },
    "total_cantidad": {
      "type": "number",
      "default": 0
    },
    "costo_total": {
      "type": "number",
      "default": 0
    },
    "importe_total": {
      "type": "number",
      "default": 0
    },
    "ganancia_total": {
      "type": "number",
      "default": 0
    },
    "periodo": {
      "type": "string",
      "description": "Etiqueta legible del per\u00edodo (ej: Marzo 2026)"
    },
    "periodo_fecha": {
      "type": "string",
      "description": "Clave del per\u00edodo en formato YYYY-MM para deduplicaci\u00f3n"
    },
    "imported_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "tienda_internal_id",
    "periodo_fecha"
  ]
}