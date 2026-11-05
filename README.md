# Sistema de Gestión Integral Migratoria (SGIM) - Backend en Go (Golang)

Backend monolítico desarrollado en **Go (Golang)** bajo la arquitectura **MVC (Modelo - Vista - Controlador)** para la Subsecretaría de Migración del Ecuador, conforme a la norma **IEEE Std 830-1998**.

---

## 🏛️ Arquitectura MVC del Proyecto

```text
sgim_migracion/
├── config/                  # Gestión de Conexión a MongoDB (Pool, Ping, Singleton)
│   ├── database.go          # Struct Database ("Clase" de conexión oficial)
│   └── database_test.go     # Pruebas de conectividad con MongoDB
├── models/                  # [M] MODELOS: Entidades BSON mapeadas al JSON Schema
│   ├── filters/             # Filtros sanitizadores anti-incompatibilidad BSON
│   │   └── bson_filter.go   # Normalizador UTC, casteador int32, parser ObjectID
│   ├── persona.go           # Núcleo: personas, correos, telefonos, direcciones, biometría
│   ├── usuario.go           # Usuarios institucionales y contraseñas bcrypt
│   ├── auditoria.go         # Bitácora inmutable de eventos (quién, qué, cuándo)
│   ├── proteccion_internacional.go # Módulo 1: solicitudes_pi, visas_pi, beneficios
│   ├── movimiento.go        # Módulo 2: movimientos de ingreso/salida y alertas
│   ├── visa.go              # Módulo 3: solicitudes_visa, visas emitidas, prórrogas
│   ├── censo.go             # Módulo 4: censos, certificados y regularización VIRTE
│   └── catalogo.go          # Catálogos maestros parametrizados
├── views/                   # [V] VISTAS: Formateadores y serializadores de respuesta
│   └── response.go          # Standard JSON Envelopes (Success, Error, Paginated)
├── controllers/             # [C] CONTROLADORES: Lógica de endpoints y bindings
│   ├── auth_controller.go        # Login, registro y perfil
│   ├── persona_controller.go     # CRUD y expediente de personas
│   ├── proteccion_controller.go  # Solicitudes de refugio, visas PI y beneficios
│   ├── movimiento_controller.go  # Ingreso/Salida y mock de Interpol
│   ├── visa_controller.go        # Solicitudes de visa y prórrogas turísticas
│   ├── censo_controller.go       # Censos, certificados y amnistía VIRTE
│   ├── catalogo_controller.go    # Consulta de catálogos maestros
│   └── auditoria_controller.go   # Consulta de bitácora para administradores
├── middlewares/             # Interceptores de autenticación JWT, RBAC y CORS
│   ├── auth.go              # Tokens JWT y control de acceso por roles
│   └── cors.go              # Encabezados CORS para cliente web TypeScript
├── routes/                  # Enrutador HTTP nativo (Go 1.22+ ServeMux)
│   └── routes.go            # Registro unificado de endpoints
├── main.go                  # Punto de arranque, bootstrap de admin y graceful shutdown
└── go.mod                   # Módulos y dependencias oficiales
```

---

## ⚙️ Conexión a MongoDB y Filtros Anti-Incompatibilidad

La base de datos `sgim_migracion` tiene configuradas validaciones estrictas (`validationLevel: "strict"`, `additionalProperties: false`). Para evitar fallos `DocumentValidationFailure`:

1. **Filtro de Tipos Enteros (`int32`):** Go en 64 bits serializa `int` como `int64`. Campos como `dias_permitidos` en `movimientos` y `orden` en `catalogos` son forzados a `int32` mediante `filters.IntToInt32()`.
2. **Filtro de Fechas UTC:** Todas las fechas se normalizan a `time.Time` en milisegundos UTC (`filters.NormalizeUTC()`).
3. **Mapeo Estricto BSON:** Cada modelo contiene únicamente los tags aprobados por el esquema, impidiendo que campos no autorizados sean enviados al documento.
4. **Control de Nulos:** Los punteros se usan exclusivamente en campos que admiten `["tipo", "null"]` (`persona_id` en `usuarios`, `valores_anteriores/nuevos` e `ip` en `auditoria`, y `detalle_alerta` en `alertas_consultadas`).

---

## 🎨 Frontend en React + TypeScript (Vite + Tailwind CSS)

El frontend incluye:
1. **Portal Público de Atención Migratoria:**
   - Barra superior con marca limpia y el botón **"Iniciar Sesión"** en la esquina superior derecha.
   - Sub-barra estilo *Ventanilla de Atención - Migración Ecuador*.
   - Sección informativa de bienvenida para extranjeros y migrantes (inspirada en el portal de Brasil adaptada a Ecuador).
   - Cuadrícula de **Trámites y Servicios** con tarjetas para: Movimientos migratorios, Prórrogas de permanencia (90 días), Solicitudes de refugio/PI, Visas de residencia, Censos y VIRTE, y Consulta de expedientes. Botones de *Detalles* e *Iniciar trámite*.
2. **Modal de Login Glassmorphism:**
   - Tarjeta translúcida con efecto *Frosted Glass*, avatar circular superior, campos de Email ID y Contraseña, botón *LOGIN*, enlace *Forgot Password?* y acceso rápido con 1 clic para los 5 integrantes del equipo.
3. **Panel Operativo por Roles:**
   - Al autenticarse, despliega el panel interno conectado en vivo a MongoDB (`sgim_migracion`), mostrando los 39 catálogos maestros y los expedientes reales de personas.

---

## 🚀 Cómo Iniciar el Sistema Completo

### Opción A: Arranque Unificado Local (Recomendado)
```bash
# 1. Instalar dependencias y compilar frontend
npm run build

# 2. Iniciar servidor unificado (Backend Go + Frontend React en un solo puerto)
npm start
```
*Disponible en `http://localhost:8080/` con la Ventanilla Web y las APIs REST activas.*

---

## ☁️ Despliegue en Render (Producción en la Nube con Docker)

El proyecto incluye un `Dockerfile` multi-stage listo para Render:

1. En tu panel de **Render**, crea un nuevo **Web Service**.
2. Conecta tu repositorio de GitHub: `EdwinG2001/sgim_migracion`.
3. Selecciona el entorno de ejecución: **Docker**.
4. En la sección **Environment Variables**, agrega:
   - `MONGO_URI`: `mongodb+srv://<usuario>:<password>@migracion.ev0zcc0.mongodb.net/?compressors=zlib`
   - `MONGO_DB_NAME`: `sgim_migracion`
   - `JWT_SECRET`: Tu clave secreta para los tokens JWT.
5. Haz clic en **Create Web Service**. Render compilará el frontend, el backend y levantará tu aplicación con URL pública HTTPS automática.

---

## 📡 Endpoints Principales Disponibles

### Autenticación
- `POST /api/auth/login` - Inicio de sesión (retorna token JWT).
- `POST /api/auth/register` - Registro de nuevos usuarios (solo Admin).
- `GET /api/auth/profile` - Consulta perfil activo.

### Catálogos y Personas
- `GET /api/catalogos` - Listado de catálogos maestros activos.
- `POST /api/personas` - Registro de nueva persona en el SGIM.
- `GET /api/personas` - Búsqueda y listado paginado.
- `GET /api/personas/{id}` - Consulta del expediente y contactos de una persona.

### Módulos Sustantivos
- `POST /api/proteccion/solicitudes` - Registro de solicitud de refugio.
- `POST /api/proteccion/visas` - Emisión de visa humanitaria por protección internacional.
- `POST /api/proteccion/beneficios` - Asignación de beneficios legales (salud, trabajo, etc.).
- `POST /api/movimientos` - Registro de ingreso/salida y consulta mock de Interpol.
- `POST /api/visas/solicitudes` - Solicitud de visa de trabajo, estudios, inversión o amparo.
- `POST /api/visas/emitir` - Emisión oficial de visa ordinaria.
- `POST /api/visas/prorrogas` - Extensión de estadía turística de hasta 90 días.
- `POST /api/censos` - Apertura de censo migratorio.
- `POST /api/censos/registro` - Registro voluntario y emisión de certificado.
- `POST /api/regularizacion/virte` - Emisión de visa de regularización extraordinaria VIRTE.
- `GET /api/auditoria` - Consulta de trazabilidad inmutable (solo Admin).

