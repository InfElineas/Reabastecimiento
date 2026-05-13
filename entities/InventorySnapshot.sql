{
  "name": "InventorySnapshot",
  "type": "object",
  "properties": {
    "offer_id": {
      "type": "string"
    },
    "offer_external_id": {
      "type": "string"
    },
    "snapshot_at": {
      "type": "string",
      "format": "date-time"
    },
    "existencia_fisica": {
      "type": "number"
    },
    "stock_reserva": {
      "type": "number"
    },
    "stock_tienda": {
      "type": "number"
    },
    "precio": {
      "type": "number"
    },
    "cantidad_reporte1": {
      "type": "number"
    },
    "kontrol_reporte1": {
      "type": "number"
    }
  },
  "required": [
    "offer_id",
    "snapshot_at"
  ]
}