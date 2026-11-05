// ==============================================================================
//  SISTEMA DE GESTIÓN INTEGRAL MIGRATORIA (SGIM - ECUADOR)
//  SCRIPT MAESTRO DE CREACIÓN Y POBLACIÓN DE BASE DE DATOS
// ==============================================================================
//  Base de datos: sgim_migracion
//  Motor: MongoDB 6.0+ / 7.0+ / 8.0+ / Atlas
//  Herramientas de ejecución:
//    - MongoDB Compass (Ventana inferior '_MONGOSH')
//    - MongoDB Shell (mongosh)
//    - Docker Mongo CLI
// ==============================================================================

// 1. Seleccionar base de datos
use("sgim_migracion");

print("==============================================================================");
print(" INICIANDO DESPLIEGUE DE BASE DE DATOS: sgim_migracion");
print("==============================================================================");

// ==============================================================================
// 2. LIMPIEZA PREVENTIVA DE COLECCIONES (Idempotencia)
// ==============================================================================
const colecciones = [
  "personas", "correos", "telefonos", "direcciones", "biometricos",
  "nucleo_familiar", "usuarios", "auditoria", "solicitudes_pi",
  "visas_pi", "beneficios", "movimientos", "alertas_consultadas",
  "solicitudes_visa", "visas", "prorrogas", "censos",
  "registros_censo", "regularizaciones", "catalogos"
];

colecciones.forEach(function(col) {
  try {
    db[col].drop();
  } catch (e) {
    // Si la colección no existía, se ignora
  }
});
print("[OK] Colecciones anteriores eliminadas para recreación limpia.");

// ==============================================================================
// 3. DEFINICIÓN DE COLECCIONES CON VALIDACIÓN ESTRICTA (JSON Schema)
// ==============================================================================

// 3.1 PERSONAS (Núcleo Maestro Biográfico)
db.createCollection("personas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "tipo_documento", "numero_documento", "nombres", "apellidos",
        "fecha_nacimiento", "nacionalidad", "sexo", "estado",
        "created_at", "updated_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        tipo_documento: {
          enum: ["pasaporte", "cedula", "documento_viaje", "otro"],
          description: "Tipo de documento de identidad oficial"
        },
        numero_documento: {
          bsonType: "string",
          minLength: 3,
          maxLength: 30
        },
        nombres: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100
        },
        apellidos: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100
        },
        fecha_nacimiento: { bsonType: "date" },
        nacionalidad: {
          bsonType: "string",
          minLength: 2,
          maxLength: 3,
          description: "Código ISO de 3 letras (ej: ECU, VEN, COL, PER)"
        },
        sexo: { enum: ["M", "F", "X"] },
        estado: { enum: ["activo", "inactivo"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.2 CORREOS ELECTRÓNICOS
db.createCollection("correos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["persona_id", "correo", "es_principal", "created_at"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        correo: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        es_principal: { bsonType: "bool" },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.3 TELÉFONOS
db.createCollection("telefonos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["persona_id", "numero", "tipo", "es_principal", "created_at"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        numero: { bsonType: "string", minLength: 7, maxLength: 20 },
        tipo: { enum: ["movil", "fijo"] },
        es_principal: { bsonType: "bool" },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.4 DIRECCIONES DOMICILIARIAS
db.createCollection("direcciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "provincia", "canton", "parroquia",
        "calle_principal", "es_actual", "fecha_desde", "created_at"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        provincia: { bsonType: "string", minLength: 2, maxLength: 50 },
        canton: { bsonType: "string", minLength: 2, maxLength: 50 },
        parroquia: { bsonType: "string", minLength: 2, maxLength: 50 },
        calle_principal: { bsonType: "string", minLength: 2, maxLength: 150 },
        es_actual: { bsonType: "bool" },
        fecha_desde: { bsonType: "date" },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.5 BIOMÉTRICOS (Fotografía / Huellas)
db.createCollection("biometricos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["persona_id", "tipo", "archivo_url", "fecha_captura", "created_at"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tipo: { enum: ["foto", "huella"] },
        archivo_url: { bsonType: "string", minLength: 5 },
        fecha_captura: { bsonType: "date" },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.6 NÚCLEO FAMILIAR
db.createCollection("nucleo_familiar", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["persona_id", "familiar_persona_id", "parentesco", "created_at"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        familiar_persona_id: { bsonType: "objectId" },
        parentesco: { enum: ["conyuge", "hijo", "hija", "padre", "madre", "hermano", "hermana", "otro"] },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.7 USUARIOS INSTITUCIONALES Y CIUDADANOS (RBAC)
db.createCollection("usuarios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "username", "password_hash", "rol", "estado",
        "created_at", "updated_at"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        username: { bsonType: "string", minLength: 4, maxLength: 60 },
        password_hash: { bsonType: "string", minLength: 20 },
        rol: {
          enum: [
            "admin",
            "oficial_migracion",
            "analista_pi",
            "analista_visas",
            "analista_regularizacion",
            "solo_lectura"
          ]
        },
        persona_id: { bsonType: ["objectId", "null"] },
        estado: { enum: ["activo", "inactivo"] },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.8 AUDITORÍA INMUTABLE
db.createCollection("auditoria", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["usuario_id", "accion", "coleccion", "documento_id", "fecha"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        usuario_id: { bsonType: "objectId" },
        accion: { enum: ["CREATE", "UPDATE", "DELETE"] },
        coleccion: { bsonType: "string" },
        documento_id: { bsonType: "objectId" },
        valores_anteriores: { bsonType: ["object", "null"] },
        valores_nuevos: { bsonType: ["object", "null"] },
        fecha: { bsonType: "date" },
        ip: { bsonType: ["string", "null"] }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.9 MÓDULO 1: SOLICITUDES DE PROTECCIÓN INTERNACIONAL (REFUGIO)
db.createCollection("solicitudes_pi", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "motivo_salida", "pais_origen",
        "fecha_ingreso_ecuador", "estado", "fecha_solicitud",
        "created_at", "updated_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        motivo_salida: { bsonType: "string", minLength: 10, maxLength: 2000 },
        pais_origen: { bsonType: "string", minLength: 2, maxLength: 3 },
        fecha_ingreso_ecuador: { bsonType: "date" },
        estado: { enum: ["en_tramite", "aprobado", "rechazado", "archivado"] },
        fecha_solicitud: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.10 MÓDULO 1: VISAS DE PROTECCIÓN INTERNACIONAL
db.createCollection("visas_pi", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "solicitud_pi_id", "persona_id", "numero_visa",
        "fecha_emision", "fecha_vigencia", "estado", "created_at"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        solicitud_pi_id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        numero_visa: { bsonType: "string", minLength: 5, maxLength: 30 },
        fecha_emision: { bsonType: "date" },
        fecha_vigencia: { bsonType: "date" },
        estado: { enum: ["emitida", "vencida", "revocada"] },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.11 MÓDULO 1: BENEFICIOS HUMANITARIOS
db.createCollection("beneficios", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "tipo_beneficio", "fecha_asignacion",
        "estado", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tipo_beneficio: { enum: ["salud", "educacion", "trabajo", "cedula"] },
        fecha_asignacion: { bsonType: "date" },
        estado: { enum: ["activo", "inactivo"] },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.12 MÓDULO 2: MOVIMIENTOS MIGRATORIOS (Entradas y Salidas Fronterizas)
db.createCollection("movimientos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "tipo", "punto_control", "fecha_hora",
        "medio_transporte", "motivo_viaje", "requiere_visa",
        "dias_permitidos", "estado", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tipo: { enum: ["ingreso", "salida"] },
        punto_control: { bsonType: "string", minLength: 2, maxLength: 80 },
        fecha_hora: { bsonType: "date" },
        medio_transporte: { enum: ["aereo", "terrestre", "maritimo", "fluvial"] },
        motivo_viaje: { bsonType: "string", minLength: 2, maxLength: 100 },
        requiere_visa: { bsonType: "bool" },
        dias_permitidos: { bsonType: "int", minimum: 0, maximum: 365 },
        estado: { enum: ["activo", "anulado"] },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.13 MÓDULO 2: ALERTAS CONSULTADAS (Interpol / Policía)
db.createCollection("alertas_consultadas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["movimiento_id", "persona_id", "tiene_alerta", "fuente", "fecha_consulta"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        movimiento_id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tiene_alerta: { bsonType: "bool" },
        detalle_alerta: { bsonType: ["string", "null"] },
        fuente: { enum: ["mock_interpol", "policial", "otro"] },
        fecha_consulta: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.14 MÓDULO 3: SOLICITUDES DE VISA DE RESIDENCIA
db.createCollection("solicitudes_visa", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "tipo_visa", "estado", "fecha_solicitud",
        "created_at", "updated_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tipo_visa: { enum: ["trabajo", "estudios", "inversion", "amparo_familiar"] },
        estado: { enum: ["recibida", "en_revision", "aprobada", "rechazada", "emitida"] },
        fecha_solicitud: { bsonType: "date" },
        created_at: { bsonType: "date" },
        updated_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.15 MÓDULO 3: VISAS DE RESIDENCIA EMITIDAS
db.createCollection("visas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "solicitud_visa_id", "persona_id", "numero_visa",
        "tipo_visa", "fecha_emision", "fecha_vigencia",
        "estado", "created_at"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        solicitud_visa_id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        numero_visa: { bsonType: "string", minLength: 5, maxLength: 30 },
        tipo_visa: { enum: ["trabajo", "estudios", "inversion", "amparo_familiar"] },
        fecha_emision: { bsonType: "date" },
        fecha_vigencia: { bsonType: "date" },
        estado: { enum: ["emitida", "vencida", "revocada"] },
        created_at: { bsonType: "date" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.16 MÓDULO 3: PRÓRROGAS DE ESTADÍA TURÍSTICA
db.createCollection("prorrogas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "movimiento_ingreso_id", "fecha_solicitud",
        "fecha_vencimiento_original", "nueva_fecha_vencimiento",
        "estado", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        movimiento_ingreso_id: { bsonType: "objectId" },
        fecha_solicitud: { bsonType: "date" },
        fecha_vencimiento_original: { bsonType: "date" },
        nueva_fecha_vencimiento: { bsonType: "date" },
        estado: { enum: ["solicitada", "aprobada", "rechazada"] },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.17 MÓDULO 4: CENSOS MIGRATORIOS
db.createCollection("censos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "nombre", "descripcion", "fecha_inicio", "fecha_fin",
        "estado", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        nombre: { bsonType: "string", minLength: 5, maxLength: 150 },
        descripcion: { bsonType: "string", minLength: 10, maxLength: 1000 },
        fecha_inicio: { bsonType: "date" },
        fecha_fin: { bsonType: "date" },
        estado: { enum: ["abierto", "cerrado"] },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.18 MÓDULO 4: REGISTROS DE CENSO
db.createCollection("registros_censo", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "censo_id", "persona_id", "numero_certificado",
        "fecha_registro", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        censo_id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        numero_certificado: { bsonType: "string", minLength: 5, maxLength: 40 },
        fecha_registro: { bsonType: "date" },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.19 MÓDULO 4: REGULARIZACIONES EXTRAORDINARIAS (VIRTE)
db.createCollection("regularizaciones", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "persona_id", "tipo", "numero_visa", "fecha_emision",
        "fecha_vigencia", "estado", "created_at", "created_by"
      ],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        persona_id: { bsonType: "objectId" },
        tipo: { enum: ["VIRTE", "otra_amnistia"] },
        numero_visa: { bsonType: "string", minLength: 5, maxLength: 30 },
        fecha_emision: { bsonType: "date" },
        fecha_vigencia: { bsonType: "date" },
        estado: { enum: ["emitida", "vencida", "revocada"] },
        created_at: { bsonType: "date" },
        created_by: { bsonType: "objectId" }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// 3.20 CATÁLOGOS MAESTROS DEL SISTEMA
db.createCollection("catalogos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tipo", "codigo", "nombre", "activo", "orden"],
      additionalProperties: false,
      properties: {
        _id: { bsonType: "objectId" },
        tipo: {
          enum: [
            "paises",
            "tipos_visa",
            "puntos_control",
            "tipos_beneficio",
            "motivos_pi",
            "parentescos",
            "medios_transporte"
          ]
        },
        codigo: { bsonType: "string", minLength: 1, maxLength: 30 },
        nombre: { bsonType: "string", minLength: 1, maxLength: 100 },
        activo: { bsonType: "bool" },
        orden: { bsonType: "int", minimum: 0 }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

print("[OK] Las 20 colecciones con esquemas de validación estricta fueron creadas exitosamente.");

// ==============================================================================
// 4. CREACIÓN DE ÍNDICES (Optimización y Unicidad)
// ==============================================================================
db.personas.createIndex({ numero_documento: 1, tipo_documento: 1 }, { unique: true });
db.personas.createIndex({ apellidos: 1, nombres: 1 });
db.personas.createIndex({ nacionalidad: 1 });
db.personas.createIndex({ estado: 1 });

db.correos.createIndex({ persona_id: 1 });
db.correos.createIndex({ correo: 1 }, { unique: true });

db.telefonos.createIndex({ persona_id: 1 });

db.direcciones.createIndex({ persona_id: 1, es_actual: 1 });

db.biometricos.createIndex({ persona_id: 1, tipo: 1 });

db.nucleo_familiar.createIndex({ persona_id: 1 });
db.nucleo_familiar.createIndex({ familiar_persona_id: 1 });

db.usuarios.createIndex({ username: 1 }, { unique: true });
db.usuarios.createIndex({ rol: 1, estado: 1 });

db.auditoria.createIndex({ fecha: -1 });
db.auditoria.createIndex({ usuario_id: 1, fecha: -1 });
db.auditoria.createIndex({ coleccion: 1, documento_id: 1 });

db.solicitudes_pi.createIndex({ persona_id: 1 });
db.solicitudes_pi.createIndex({ estado: 1 });
db.solicitudes_pi.createIndex({ fecha_solicitud: -1 });

db.visas_pi.createIndex({ numero_visa: 1 }, { unique: true });
db.visas_pi.createIndex({ persona_id: 1 });
db.visas_pi.createIndex({ estado: 1 });

db.beneficios.createIndex({ persona_id: 1, tipo_beneficio: 1 });

db.movimientos.createIndex({ persona_id: 1, fecha_hora: -1 });
db.movimientos.createIndex({ punto_control: 1, fecha_hora: -1 });
db.movimientos.createIndex({ tipo: 1, estado: 1 });

db.alertas_consultadas.createIndex({ movimiento_id: 1 });
db.alertas_consultadas.createIndex({ persona_id: 1 });

db.solicitudes_visa.createIndex({ persona_id: 1 });
db.solicitudes_visa.createIndex({ estado: 1, tipo_visa: 1 });
db.solicitudes_visa.createIndex({ fecha_solicitud: -1 });

db.visas.createIndex({ numero_visa: 1 }, { unique: true });
db.visas.createIndex({ persona_id: 1 });
db.visas.createIndex({ estado: 1, fecha_vigencia: 1 });

db.prorrogas.createIndex({ persona_id: 1 });
db.prorrogas.createIndex({ estado: 1 });

db.censos.createIndex({ estado: 1 });
db.censos.createIndex({ fecha_inicio: -1 });

db.registros_censo.createIndex({ censo_id: 1, persona_id: 1 }, { unique: true });
db.registros_censo.createIndex({ numero_certificado: 1 }, { unique: true });

db.regularizaciones.createIndex({ numero_visa: 1 }, { unique: true });
db.regularizaciones.createIndex({ persona_id: 1 });
db.regularizaciones.createIndex({ tipo: 1, estado: 1 });

db.catalogos.createIndex({ tipo: 1, codigo: 1 }, { unique: true });
db.catalogos.createIndex({ tipo: 1, activo: 1, orden: 1 });

print("[OK] Todos los índices únicos y de búsqueda rápida fueron creados.");

// ==============================================================================
// 5. INSERCIÓN DE CATÁLOGOS MAESTROS (39 Catálogos Oficiales)
// ==============================================================================
db.catalogos.insertMany([
  // Países frecuentes
  { tipo: "paises", codigo: "ECU", nombre: "Ecuador", activo: true, orden: NumberInt(1) },
  { tipo: "paises", codigo: "VEN", nombre: "Venezuela", activo: true, orden: NumberInt(2) },
  { tipo: "paises", codigo: "COL", nombre: "Colombia", activo: true, orden: NumberInt(3) },
  { tipo: "paises", codigo: "PER", nombre: "Perú", activo: true, orden: NumberInt(4) },
  { tipo: "paises", codigo: "CUB", nombre: "Cuba", activo: true, orden: NumberInt(5) },
  { tipo: "paises", codigo: "HTI", nombre: "Haití", activo: true, orden: NumberInt(6) },
  { tipo: "paises", codigo: "CHN", nombre: "China", activo: true, orden: NumberInt(7) },
  { tipo: "paises", codigo: "USA", nombre: "Estados Unidos", activo: true, orden: NumberInt(8) },
  { tipo: "paises", codigo: "ESP", nombre: "España", activo: true, orden: NumberInt(9) },

  // Tipos de visa
  { tipo: "tipos_visa", codigo: "trabajo", nombre: "Visa de Trabajo", activo: true, orden: NumberInt(1) },
  { tipo: "tipos_visa", codigo: "estudios", nombre: "Visa de Estudios", activo: true, orden: NumberInt(2) },
  { tipo: "tipos_visa", codigo: "inversion", nombre: "Visa de Inversión", activo: true, orden: NumberInt(3) },
  { tipo: "tipos_visa", codigo: "amparo_familiar", nombre: "Visa de Amparo Familiar", activo: true, orden: NumberInt(4) },

  // Puntos de control fronterizo y aeropuertos
  { tipo: "puntos_control", codigo: "UIO", nombre: "Aeropuerto Mariscal Sucre (Quito)", activo: true, orden: NumberInt(1) },
  { tipo: "puntos_control", codigo: "GYE", nombre: "Aeropuerto José Joaquín de Olmedo (Guayaquil)", activo: true, orden: NumberInt(2) },
  { tipo: "puntos_control", codigo: "RUM", nombre: "Paso Fronterizo Rumichaca (Tulcán)", activo: true, orden: NumberInt(3) },
  { tipo: "puntos_control", codigo: "HUA", nombre: "Paso Fronterizo Huaquillas (El Oro)", activo: true, orden: NumberInt(4) },
  { tipo: "puntos_control", codigo: "SAN", nombre: "Paso Fronterizo San Miguel (Sucumbíos)", activo: true, orden: NumberInt(5) },
  { tipo: "puntos_control", codigo: "MAO", nombre: "Aeropuerto Eloy Alfaro (Manta)", activo: true, orden: NumberInt(6) },

  // Tipos de beneficio de protección
  { tipo: "tipos_beneficio", codigo: "salud", nombre: "Acceso a Salud Pública Gratuita", activo: true, orden: NumberInt(1) },
  { tipo: "tipos_beneficio", codigo: "educacion", nombre: "Acceso a Educación Fiscal", activo: true, orden: NumberInt(2) },
  { tipo: "tipos_beneficio", codigo: "trabajo", nombre: "Autorización para Trabajo en Dependencia", activo: true, orden: NumberInt(3) },
  { tipo: "tipos_beneficio", codigo: "cedula", nombre: "Cédula de Identidad Ecuatoriana", activo: true, orden: NumberInt(4) },

  // Motivos de protección internacional
  { tipo: "motivos_pi", codigo: "persecucion", nombre: "Persecución Política, Religiosa o de Género", activo: true, orden: NumberInt(1) },
  { tipo: "motivos_pi", codigo: "conflicto", nombre: "Conflicto Armado o Violencia Generalizada", activo: true, orden: NumberInt(2) },
  { tipo: "motivos_pi", codigo: "desastre", nombre: "Crisis Humanitaria Grave", activo: true, orden: NumberInt(3) },
  { tipo: "motivos_pi", codigo: "otro", nombre: "Otras Causales de Protección Humanitaria", activo: true, orden: NumberInt(4) },

  // Parentescos
  { tipo: "parentescos", codigo: "conyuge", nombre: "Cónyuge / Conviviente", activo: true, orden: NumberInt(1) },
  { tipo: "parentescos", codigo: "hijo", nombre: "Hijo", activo: true, orden: NumberInt(2) },
  { tipo: "parentescos", codigo: "hija", nombre: "Hija", activo: true, orden: NumberInt(3) },
  { tipo: "parentescos", codigo: "padre", nombre: "Padre", activo: true, orden: NumberInt(4) },
  { tipo: "parentescos", codigo: "madre", nombre: "Madre", activo: true, orden: NumberInt(5) },
  { tipo: "parentescos", codigo: "hermano", nombre: "Hermano", activo: true, orden: NumberInt(6) },
  { tipo: "parentescos", codigo: "hermana", nombre: "Hermana", activo: true, orden: NumberInt(7) },
  { tipo: "parentescos", codigo: "otro", nombre: "Otro Familiar Cercano", activo: true, orden: NumberInt(8) },

  // Medios de transporte
  { tipo: "medios_transporte", codigo: "aereo", nombre: "Vuelo Comercial Internacional (Aéreo)", activo: true, orden: NumberInt(1) },
  { tipo: "medios_transporte", codigo: "terrestre", nombre: "Transporte Terrestre Fronterizo", activo: true, orden: NumberInt(2) },
  { tipo: "medios_transporte", codigo: "maritimo", nombre: "Transporte Marítimo Internacional", activo: true, orden: NumberInt(3) },
  { tipo: "medios_transporte", codigo: "fluvial", nombre: "Transporte Fluvial Fronterizo", activo: true, orden: NumberInt(4) }
]);
print("[OK] Catálogos maestros insertados (Total: " + db.catalogos.countDocuments() + ").");

// ==============================================================================
// 6. INSERCIÓN DE USUARIOS Y FUNCIONARIOS DEL EQUIPO SGIM
// ==============================================================================
const now = new Date();

// Identificadores fijos para integridad referencial perfecta
const idAdminPersona    = ObjectId("6ae412498461f1d5bb5fcc18");
const idJosuePersona    = ObjectId("6ae412498461f1d5bb5fcc19");
const idMilenaPersona   = ObjectId("6ae412498461f1d5bb5fcc1c");
const idFranklinPersona = ObjectId("6ae412498461f1d5bb5fcc1f");
const idLesslyPersona   = ObjectId("6ae412498461f1d5bb5fcc22");

const idAdminUser       = ObjectId("6ae412498461f1d5bb5fcc25");
const idJosueUser       = ObjectId("6ae412498461f1d5bb5fcc26");
const idMilenaUser      = ObjectId("6ae412498461f1d5bb5fcc27");
const idFranklinUser    = ObjectId("6ae412498461f1d5bb5fcc28");
const idLesslyUser      = ObjectId("6ae412498461f1d5bb5fcc29");

// 6.1 Personas Institucionales (Los 5 miembros del equipo)
db.personas.insertMany([
  {
    _id: idAdminPersona,
    tipo_documento: "cedula",
    numero_documento: "0800000001",
    nombres: "Edwin Guillermo",
    apellidos: "San Lucas Arroyo",
    fecha_nacimiento: new Date("2001-01-01T00:00:00Z"),
    nacionalidad: "ECU",
    sexo: "M",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idJosuePersona,
    tipo_documento: "cedula",
    numero_documento: "0804819203",
    nombres: "Josue Leonardo",
    apellidos: "Intriago Salazar",
    fecha_nacimiento: new Date("2002-04-12T00:00:00Z"),
    nacionalidad: "ECU",
    sexo: "M",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idMilenaPersona,
    tipo_documento: "cedula",
    numero_documento: "0803921845",
    nombres: "Milena Jazmin",
    apellidos: "Corozo Angulo",
    fecha_nacimiento: new Date("2003-08-20T00:00:00Z"),
    nacionalidad: "ECU",
    sexo: "F",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idFranklinPersona,
    tipo_documento: "cedula",
    numero_documento: "0805172938",
    nombres: "Franklin Andres",
    apellidos: "Caisa Preciado",
    fecha_nacimiento: new Date("2002-11-05T00:00:00Z"),
    nacionalidad: "ECU",
    sexo: "M",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idLesslyPersona,
    tipo_documento: "cedula",
    numero_documento: "0806283914",
    nombres: "Lessly Jelena",
    apellidos: "Caicedo Medina",
    fecha_nacimiento: new Date("2003-02-18T00:00:00Z"),
    nacionalidad: "ECU",
    sexo: "F",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  }
]);

// 6.2 Correos de Funcionarios
db.correos.insertMany([
  { persona_id: idAdminPersona, correo: "admin.sanlucas@sgim.gob.ec", es_principal: true, created_at: now },
  { persona_id: idJosuePersona, correo: "intriagoofimi@gmail.com", es_principal: true, created_at: now },
  { persona_id: idMilenaPersona, correo: "corozoanalis@gmail.com", es_principal: true, created_at: now },
  { persona_id: idFranklinPersona, correo: "caisavisas@gmail.com", es_principal: true, created_at: now },
  { persona_id: idLesslyPersona, correo: "caicedoregu@gmail.com", es_principal: true, created_at: now }
]);

// 6.3 Usuarios con Hash Bcrypt válidos para el Backend Go
// Contraseñas asignadas:
// admin -> Admin2026*
// intriagoofimi@gmail.com -> in12345
// corozoanalis@gmail.com  -> co12345
// caisavisas@gmail.com   -> ca12345
// caicedoregu@gmail.com  -> les12345
db.usuarios.insertMany([
  {
    _id: idAdminUser,
    username: "admin",
    password_hash: "$2a$10$3tzgVnPm9/5ubE.R4psiGu.5Ar/mS/3KrfR5NGdmwRh/63ON.0QFS",
    rol: "admin",
    persona_id: idAdminPersona,
    estado: "activo",
    created_at: now,
    updated_at: now
  },
  {
    _id: idJosueUser,
    username: "intriagoofimi@gmail.com",
    password_hash: "$2a$10$YJT4fNjGY04rvNSzrV0jFeEu/lktFWE/XjA1SBl/DwhNQOEoTNtl2",
    rol: "oficial_migracion",
    persona_id: idJosuePersona,
    estado: "activo",
    created_at: now,
    updated_at: now
  },
  {
    _id: idMilenaUser,
    username: "corozoanalis@gmail.com",
    password_hash: "$2a$10$1HlQuQAQxIPQUI5pTnYurePC4G.qvxrAzqoR4dEW/fXADAFO2cC4i",
    rol: "analista_pi",
    persona_id: idMilenaPersona,
    estado: "activo",
    created_at: now,
    updated_at: now
  },
  {
    _id: idFranklinUser,
    username: "caisavisas@gmail.com",
    password_hash: "$2a$10$M4ZG9fe6WMPgCPWaFHqFhuHqqARhNUA4I1UXNU3YEzC2YEvzVuo6m",
    rol: "analista_visas",
    persona_id: idFranklinPersona,
    estado: "activo",
    created_at: now,
    updated_at: now
  },
  {
    _id: idLesslyUser,
    username: "caicedoregu@gmail.com",
    password_hash: "$2a$10$VyUoplNUUxGPW8hhgXqt7OzbFrBMwnjBP.yfZiKnnovvY3CqGKbye",
    rol: "analista_regularizacion",
    persona_id: idLesslyPersona,
    estado: "activo",
    created_at: now,
    updated_at: now
  }
]);
print("[OK] Cuentas de los 5 funcionarios del equipo creadas con credenciales seguras.");

// ==============================================================================
// 7. INSERCIÓN DE DATOS DE PRUEBA REALISTAS (CIUDADANOS Y LOS 4 MÓDULOS)
// ==============================================================================

// 7.1 Ciudadanos Extranjeros de Prueba
const idExtranjero1 = ObjectId("6ae500000000000000000001");
const idExtranjero2 = ObjectId("6ae500000000000000000002");
const idExtranjero3 = ObjectId("6ae500000000000000000003");

db.personas.insertMany([
  {
    _id: idExtranjero1,
    tipo_documento: "pasaporte",
    numero_documento: "VEN83941029",
    nombres: "Carlos Alberto",
    apellidos: "Rodríguez Gómez",
    fecha_nacimiento: new Date("1995-06-15T00:00:00Z"),
    nacionalidad: "VEN",
    sexo: "M",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idExtranjero2,
    tipo_documento: "pasaporte",
    numero_documento: "COL58204918",
    nombres: "María Fernanda",
    apellidos: "Morales López",
    fecha_nacimiento: new Date("1998-11-23T00:00:00Z"),
    nacionalidad: "COL",
    sexo: "F",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  },
  {
    _id: idExtranjero3,
    tipo_documento: "pasaporte",
    numero_documento: "PER91028472",
    nombres: "Juan Diego",
    apellidos: "Quispe Quispe",
    fecha_nacimiento: new Date("1992-03-30T00:00:00Z"),
    nacionalidad: "PER",
    sexo: "M",
    estado: "activo",
    created_at: now,
    updated_at: now,
    created_by: idAdminUser
  }
]);

// Correos y Teléfonos de los Extranjeros
db.correos.insertMany([
  { persona_id: idExtranjero1, correo: "carlos.rodriguez@gmail.com", es_principal: true, created_at: now },
  { persona_id: idExtranjero2, correo: "maria.morales@gmail.com", es_principal: true, created_at: now },
  { persona_id: idExtranjero3, correo: "juan.quispe@gmail.com", es_principal: true, created_at: now }
]);

db.telefonos.insertMany([
  { persona_id: idExtranjero1, numero: "0987654321", tipo: "movil", es_principal: true, created_at: now },
  { persona_id: idExtranjero2, numero: "0991234567", tipo: "movil", es_principal: true, created_at: now },
  { persona_id: idExtranjero3, numero: "0978901234", tipo: "movil", es_principal: true, created_at: now }
]);

db.direcciones.insertMany([
  {
    persona_id: idExtranjero1,
    provincia: "Pichincha",
    canton: "Quito",
    parroquia: "Iñaquito",
    calle_principal: "Av. Amazonas N34-120 y Naciones Unidas",
    es_actual: true,
    fecha_desde: new Date("2024-01-15T00:00:00Z"),
    created_at: now
  },
  {
    persona_id: idExtranjero2,
    provincia: "Guayas",
    canton: "Guayaquil",
    parroquia: "Tarqui",
    calle_principal: "Av. Francisco de Orellana 204",
    es_actual: true,
    fecha_desde: new Date("2024-03-01T00:00:00Z"),
    created_at: now
  }
]);

// 7.2 MÓDULO 1: CASOS DE REFUGIO / PROTECCIÓN INTERNACIONAL
const idSolicitudPI1 = ObjectId("6ae510000000000000000001");
const idSolicitudPI2 = ObjectId("6ae510000000000000000002");

db.solicitudes_pi.insertMany([
  {
    _id: idSolicitudPI1,
    persona_id: idExtranjero1,
    motivo_salida: "Persecución política individualizada, amenazas directas contra la integridad familiar y cierre arbitrario de fuentes laborales por opiniones políticas.",
    pais_origen: "VEN",
    fecha_ingreso_ecuador: new Date("2024-02-10T00:00:00Z"),
    estado: "aprobado",
    fecha_solicitud: new Date("2024-02-15T00:00:00Z"),
    created_at: now,
    updated_at: now,
    created_by: idMilenaUser
  },
  {
    _id: idSolicitudPI2,
    persona_id: idExtranjero2,
    motivo_salida: "Desplazamiento forzado por violencia armada y extorsión sistemática por grupos irregulares en zona rural fronteriza.",
    pais_origen: "COL",
    fecha_ingreso_ecuador: new Date("2024-04-01T00:00:00Z"),
    estado: "en_tramite",
    fecha_solicitud: new Date("2024-04-05T00:00:00Z"),
    created_at: now,
    updated_at: now,
    created_by: idMilenaUser
  }
]);

// Visa PI emitida para el solicitante aprobado
db.visas_pi.insertOne({
  solicitud_pi_id: idSolicitudPI1,
  persona_id: idExtranjero1,
  numero_visa: "VPI-2024-EC-00841",
  fecha_emision: new Date("2024-03-01T00:00:00Z"),
  fecha_vigencia: new Date("2026-03-01T00:00:00Z"),
  estado: "emitida",
  created_at: now
});

// Beneficio humanitario de salud
db.beneficios.insertOne({
  persona_id: idExtranjero1,
  tipo_beneficio: "salud",
  fecha_asignacion: new Date("2024-03-05T00:00:00Z"),
  estado: "activo",
  created_at: now,
  created_by: idMilenaUser
});

// 7.3 MÓDULO 2: CONTROL DE MOVIMIENTOS FRONTERIZOS
const idMovimiento1 = ObjectId("6ae520000000000000000001");

db.movimientos.insertOne({
  _id: idMovimiento1,
  persona_id: idExtranjero3,
  tipo: "ingreso",
  punto_control: "Aeropuerto Mariscal Sucre (Quito)",
  fecha_hora: new Date("2024-05-10T14:30:00Z"),
  medio_transporte: "aereo",
  motivo_viaje: "Turismo y reuniones académicas de investigación",
  requiere_visa: false,
  dias_permitidos: NumberInt(90),
  estado: "activo",
  created_at: now,
  created_by: idJosueUser
});

// Verificación de Alertas en Movimiento
db.alertas_consultadas.insertOne({
  movimiento_id: idMovimiento1,
  persona_id: idExtranjero3,
  tiene_alerta: false,
  detalle_alerta: null,
  fuente: "mock_interpol",
  fecha_consulta: new Date("2024-05-10T14:31:00Z")
});

// 7.4 MÓDULO 3: VISAS Y PRÓRROGAS
const idSolicitudVisa1 = ObjectId("6ae530000000000000000001");

db.solicitudes_visa.insertOne({
  _id: idSolicitudVisa1,
  persona_id: idExtranjero3,
  tipo_visa: "trabajo",
  estado: "emitida",
  fecha_solicitud: new Date("2024-06-01T00:00:00Z"),
  created_at: now,
  updated_at: now,
  created_by: idFranklinUser
});

db.visas.insertOne({
  solicitud_visa_id: idSolicitudVisa1,
  persona_id: idExtranjero3,
  numero_visa: "VISA-TRAB-2024-0194",
  tipo_visa: "trabajo",
  fecha_emision: new Date("2024-06-15T00:00:00Z"),
  fecha_vigencia: new Date("2026-06-15T00:00:00Z"),
  estado: "emitida",
  created_at: now
});

// Prórroga de turismo (90 días reglamentarios)
db.prorrogas.insertOne({
  persona_id: idExtranjero3,
  movimiento_ingreso_id: idMovimiento1,
  fecha_solicitud: new Date("2024-07-20T00:00:00Z"),
  fecha_vencimiento_original: new Date("2024-08-08T00:00:00Z"),
  nueva_fecha_vencimiento: new Date("2024-11-06T00:00:00Z"),
  estado: "aprobada",
  created_at: now,
  created_by: idFranklinUser
});

// 7.5 MÓDULO 4: CENSOS Y REGULARIZACIÓN EXTRAORDINARIA VIRTE
const idCenso1 = ObjectId("6ae540000000000000000001");

db.censos.insertOne({
  _id: idCenso1,
  nombre: "Proceso Extraordinario de Registro y Censo Migratorio Nacional 2026",
  descripcion: "Empadronamiento general de ciudadanos extranjeros en territorio ecuatoriano para regularización migratoria e inclusión social.",
  fecha_inicio: new Date("2024-01-01T00:00:00Z"),
  fecha_fin: new Date("2026-12-31T23:59:59Z"),
  estado: "abierto",
  created_at: now,
  created_by: idLesslyUser
});

db.registros_censo.insertOne({
  censo_id: idCenso1,
  persona_id: idExtranjero1,
  numero_certificado: "CERT-CENSO-2024-009182",
  fecha_registro: new Date("2024-01-20T00:00:00Z"),
  created_at: now,
  created_by: idLesslyUser
});

db.regularizaciones.insertOne({
  persona_id: idExtranjero1,
  tipo: "VIRTE",
  numero_visa: "VIRTE-EC-2024-9102",
  fecha_emision: new Date("2024-02-01T00:00:00Z"),
  fecha_vigencia: new Date("2026-02-01T00:00:00Z"),
  estado: "emitida",
  created_at: now,
  created_by: idLesslyUser
});

// 7.6 AUDITORÍA: Trazabilidad Inicial del Sistema
db.auditoria.insertOne({
  usuario_id: idAdminUser,
  accion: "CREATE",
  coleccion: "sistema_bootstrap",
  documento_id: idAdminPersona,
  valores_anteriores: null,
  valores_nuevos: { mensaje: "Inicialización exitosa de base de datos sgim_migracion" },
  fecha: now,
  ip: "127.0.0.1"
});

// ==============================================================================
// 8. RESUMEN FINAL DE COMPROBACIÓN
// ==============================================================================
print("");
print("==============================================================================");
print(" DESPLIEGUE DE BASE DE DATOS FINALIZADO CON ÉXITO");
print("==============================================================================");
print("Base de datos activa: " + db.getName());
print("");
print("Resumen de documentos por colección:");
colecciones.forEach(function(col) {
  const count = db[col].countDocuments();
  print("  • " + col.padEnd(25) + ": " + count + " documentos");
});
print("------------------------------------------------------------------------------");
print("Total colecciones activas: " + db.getCollectionNames().length);
print("==============================================================================");
print("CREDENCIALES LISTAS PARA PRUEBAS (Usuario / Contraseña):");
print("  - Administrador:             admin / Admin2026*");
print("  - Oficial Migración (M2):    intriagoofimi@gmail.com / in12345");
print("  - Analista Refugio PI (M1):  corozoanalis@gmail.com / co12345");
print("  - Analista Visas (M3):       caisavisas@gmail.com / ca12345");
print("  - Analista Regulariz. (M4):  caicedoregu@gmail.com / les12345");
print("==============================================================================");
