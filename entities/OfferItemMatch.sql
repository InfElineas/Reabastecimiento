{
  "name": "OfferItemMatch",
  "type": "object",
  "properties": {
    "offer_item_id": {
      "type": "string"
    },
    "offer_id": {
      "type": "string"
    },
    "internal_offer_id": {
      "type": "string",
      "description": "ID del Offer interno (tiene stock)"
    },
    "internal_product_code": {
      "type": "string"
    },
    "internal_product_name": {
      "type": "string"
    },
    "match_type": {
      "type": "string",
      "enum": [
        "auto_exact",
        "auto_fuzzy",
        "manual"
      ],
      "default": "manual"
    },
    "match_confidence": {
      "type": "number"
    },
    "confirmed_at": {
      "type": "string",
      "format": "date-time"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "confirmed",
        "rejected"
      ],
      "default": "pending"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "offer_item_id",
    "offer_id"
  ]
}