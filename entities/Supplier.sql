{
  "name": "Supplier",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Nombre del proveedor"
    },
    "code": {
      "type": "string",
      "description": "C\u00f3digo interno"
    },
    "contact_name": {
      "type": "string"
    },
    "email": {
      "type": "string"
    },
    "phone": {
      "type": "string"
    },
    "address": {
      "type": "string"
    },
    "country": {
      "type": "string"
    },
    "tax_id": {
      "type": "string",
      "description": "RIF / NIF / CUIT"
    },
    "default_currency": {
      "type": "string",
      "default": "USD"
    },
    "default_exchange_rate": {
      "type": "number",
      "default": 1
    },
    "default_lead_time_days": {
      "type": "number"
    },
    "default_min_qty": {
      "type": "number",
      "default": 1
    },
    "default_pack_multiple": {
      "type": "number",
      "default": 1
    },
    "payment_terms": {
      "type": "string"
    },
    "notes": {
      "type": "string"
    },
    "is_active": {
      "type": "boolean",
      "default": true
    }
  },
  "required": [
    "name"
  ]
}