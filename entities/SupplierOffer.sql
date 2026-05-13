{
  "name": "SupplierOffer",
  "type": "object",
  "properties": {
    "supplier_id": {
      "type": "string"
    },
    "supplier_name": {
      "type": "string"
    },
    "offer_name": {
      "type": "string"
    },
    "source_file_url": {
      "type": "string"
    },
    "source_file_name": {
      "type": "string"
    },
    "valid_from": {
      "type": "string",
      "format": "date"
    },
    "valid_until": {
      "type": "string",
      "format": "date"
    },
    "status": {
      "type": "string",
      "enum": [
        "draft",
        "imported",
        "partially_matched",
        "fully_matched",
        "ordered",
        "expired",
        "archived"
      ],
      "default": "draft"
    },
    "currency": {
      "type": "string",
      "default": "USD"
    },
    "exchange_rate": {
      "type": "number",
      "default": 1
    },
    "total_rows": {
      "type": "number",
      "default": 0
    },
    "valid_rows": {
      "type": "number",
      "default": 0
    },
    "invalid_rows": {
      "type": "number",
      "default": 0
    },
    "matched_rows": {
      "type": "number",
      "default": 0
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "supplier_name",
    "offer_name"
  ]
}