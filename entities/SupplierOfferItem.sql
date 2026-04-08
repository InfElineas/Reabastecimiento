{
  "name": "SupplierOfferItem",
  "type": "object",
  "properties": {
    "offer_id": {
      "type": "string"
    },
    "row_number": {
      "type": "number"
    },
    "supplier_product_code": {
      "type": "string"
    },
    "supplier_product_name": {
      "type": "string"
    },
    "supplier_description": {
      "type": "string"
    },
    "format": {
      "type": "string"
    },
    "unit": {
      "type": "string"
    },
    "offered_cost": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "min_qty": {
      "type": "number",
      "default": 1
    },
    "pack_multiple": {
      "type": "number",
      "default": 1
    },
    "availability": {
      "type": "string"
    },
    "lead_time_days": {
      "type": "number"
    },
    "valid_until": {
      "type": "string"
    },
    "is_valid": {
      "type": "boolean",
      "default": true
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "offer_id",
    "supplier_product_name"
  ]
}