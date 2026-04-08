{
  "name": "Product",
  "type": "object",
  "properties": {
    "codigo": {
      "type": "string",
      "description": "C\u00f3digo \u00fanico del producto"
    },
    "nombre": {
      "type": "string",
      "description": "Nombre del producto"
    },
    "nombre_normalizado": {
      "type": "string",
      "description": "Nombre normalizado en min\u00fasculas"
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
    },
    "unidad_compra": {
      "type": "string"
    },
    "peso_lb": {
      "type": "number"
    },
    "descripcion": {
      "type": "string"
    },
    "gtin": {
      "type": "string"
    },
    "net_content_value": {
      "type": "string"
    },
    "net_content_unit": {
      "type": "string"
    },
    "pais_origen": {
      "type": "string"
    },
    "fotos": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "codigo",
    "nombre"
  ]
}