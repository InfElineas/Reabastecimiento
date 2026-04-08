{
  "name": "PurchaseOrderItem",
  "type": "object",
  "properties": {
    "purchase_order_id": {
      "type": "string"
    },
    "offer_item_id": {
      "type": "string"
    },
    "internal_offer_id": {
      "type": "string"
    },
    "internal_product_code": {
      "type": "string"
    },
    "product_name": {
      "type": "string"
    },
    "supplier_product_name": {
      "type": "string"
    },
    "unit": {
      "type": "string"
    },
    "unit_cost": {
      "type": "number"
    },
    "currency": {
      "type": "string"
    },
    "min_qty": {
      "type": "number"
    },
    "pack_multiple": {
      "type": "number"
    },
    "current_stock": {
      "type": "number"
    },
    "suggested_qty": {
      "type": "number"
    },
    "final_qty": {
      "type": "number"
    },
    "subtotal": {
      "type": "number"
    },
    "override_reason": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "included",
        "excluded"
      ],
      "default": "included"
    }
  },
  "required": [
    "purchase_order_id",
    "product_name",
    "final_qty"
  ]
}