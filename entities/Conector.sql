{
  "name": "Connector",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Nombre descriptivo del conector"
    },
    "type": {
      "type": "string",
      "enum": [
        "http_endpoint",
        "ftp",
        "sftp",
        "local_path"
      ],
      "description": "Tipo de conector"
    },
    "report_type": {
      "type": "string",
      "enum": [
        "reporte_almacen",
        "reporte_submayor",
        "ambos"
      ],
      "description": "Tipo de reporte que importa"
    },
    "url_or_path": {
      "type": "string",
      "description": "URL del endpoint o ruta del archivo"
    },
    "auth_header": {
      "type": "string",
      "description": "Header de autenticaci\u00f3n (Bearer token, Basic, etc.)"
    },
    "ftp_host": {
      "type": "string"
    },
    "ftp_port": {
      "type": "number"
    },
    "ftp_user": {
      "type": "string"
    },
    "ftp_password": {
      "type": "string"
    },
    "ftp_remote_path": {
      "type": "string"
    },
    "schedule": {
      "type": "string",
      "enum": [
        "manual",
        "hourly",
        "every_6h",
        "every_12h",
        "daily"
      ],
      "default": "manual"
    },
    "is_active": {
      "type": "boolean",
      "default": false
    },
    "last_run_at": {
      "type": "string",
      "format": "date-time"
    },
    "last_run_status": {
      "type": "string",
      "enum": [
        "success",
        "error",
        "pending",
        "never"
      ]
    },
    "last_run_message": {
      "type": "string"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "name",
    "type",
    "report_type"
  ]
}