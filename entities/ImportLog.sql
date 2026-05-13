{
  "name": "ImportLog",
  "type": "object",
  "properties": {
    "import_type": {
      "type": "string",
      "enum": [
        "reporte_almacen",
        "reporte_submayor",
        "ambos"
      ]
    },
    "status": {
      "type": "string",
      "enum": [
        "success",
        "partial",
        "error"
      ]
    },
    "total_records": {
      "type": "number"
    },
    "processed": {
      "type": "number"
    },
    "errors_count": {
      "type": "number"
    },
    "warnings_count": {
      "type": "number"
    },
    "details": {
      "type": "string",
      "description": "JSON string with error/warning details"
    },
    "imported_by": {
      "type": "string"
    }
  },
  "required": [
    "import_type",
    "status"
  ]
}