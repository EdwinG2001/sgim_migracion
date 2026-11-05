# Guía de Ejecución y Estructura de Base de Datos — SGIM Ecuador
**Sistema de Gestión Integral Migratoria (SGIM)**  
**Base de Datos:** `sgim_migracion`  
**Motor:** MongoDB (v6.0 / v7.0 / v8.0 / MongoDB Atlas)

---

## 📌 Contenido de la Carpeta

* **`sgim_migracion_setup.js`**: Script maestro integral escrito en lenguaje nativo de MongoDB (JavaScript / MongoSH). Contiene:
  * Eliminación preventiva e idempotente de colecciones previas.
  * Creación formal de las **20 colecciones** con validadores de esquema estrictos (**`$jsonSchema`**).
  * Creación de **índices de unicidad y búsqueda** para optimización.
  * Carga de **39 catálogos maestros** oficiales.
  * Registro de los **5 funcionarios institucionales** con contraseñas encriptadas en Bcrypt.
  * Población de **datos de prueba realistas** para los 4 módulos operativos (refugio, control fronterizo, visas, censo y auditoría).

---

## 🚀 Instrucciones de Ejecución para el Evaluador / Docente

El script puede ejecutarse en cualquiera de los siguientes entornos:

### Opción 1: Desde MongoDB Compass (Recomendada / Interfaz Gráfica)
1. Abra **MongoDB Compass** y conéctese a su servidor MongoDB local (`mongodb://localhost:27017`) o clúster en la nube.
2. En la barra inferior de MongoDB Compass, haga clic en la pestaña **`_MONGOSH`** para abrir la consola integrada.
3. Tiene dos alternativas sencillas:
   * **Alternativa Directa (Copiar y Pegar):** Abra el archivo `sgim_migracion_setup.js`, copie todo su texto (`Ctrl + A`, `Ctrl + C`), péguelo en la consola `_MONGOSH` y presione `Enter`.
   * **Alternativa por comando `load()`:** Ejecute en la consola:
     ```javascript
     load("ruta/completa/a/script bdd/sgim_migracion_setup.js")
     ```
4. En el panel izquierdo de Compass, haga clic en el botón de refrescar (icono 🔄) para ver la base de datos **`sgim_migracion`** con sus 20 colecciones pobladas.

---

### Opción 2: Desde la Terminal con `mongosh` (MongoDB Shell)
Si tiene instalada la utilidad de línea de comandos `mongosh`, ejecute en su terminal:

```bash
mongosh "mongodb://localhost:27017" "script bdd/sgim_migracion_setup.js"
```

O si su servidor requiere usuario y contraseña:
```bash
mongosh "mongodb://usuario:password@localhost:27017/admin" "script bdd/sgim_migracion_setup.js"
```

---

### Opción 3: En un contenedor Docker de MongoDB
Si levanta MongoDB mediante un contenedor Docker:

```bash
docker exec -i <nombre_o_id_del_contenedor_mongo> mongosh < "script bdd/sgim_migracion_setup.js"
```

---

## 👥 Cuentas y Credenciales de Acceso Precargadas

Una vez ejecutado el script, las siguientes cuentas quedan listas con contraseñas encriptadas mediante **Bcrypt** para iniciar sesión en la aplicación web o probar los endpoints:

| Funcionario / Usuario | Rol Operativo | Correo / Username | Contraseña | Alcance / Permisos |
| :--- | :--- | :--- | :--- | :--- |
| **Edwin Guillermo San Lucas Arroyo** | `admin` | `admin` | `Admin2026*` | Acceso global total, auditoría y administración de usuarios |
| **Milena Jazmin Corozo Angulo** | `analista_pi` | `corozoanalis@gmail.com` | `co12345` | **Módulo 1:** Solicitudes de Refugio, Visas PI y Asistencia Humanitaria |
| **Josue Leonardo Intriago Salazar** | `oficial_migracion` | `intriagoofimi@gmail.com` | `in12345` | **Módulo 2:** Movimientos migratorios de entrada/salida y consulta de alertas |
| **Franklin Andres Caisa Preciado** | `analista_visas` | `caisavisas@gmail.com` | `ca12345` | **Módulo 3:** Solicitudes de Visas de Residencia y Prórrogas de Turismo |
| **Lessly Jelena Caicedo Medina** | `analista_regularizacion` | `caicedoregu@gmail.com` | `les12345` | **Módulo 4:** Censo Migratorio y Regularización Extraordinaria VIRTE |

---

## 📊 Arquitectura de las 20 Colecciones en MongoDB

1. **`personas`**: Núcleo maestro biográfico y demográfico único de ecuatorianos y extranjeros.
2. **`correos`**: Relación 1:N de cuentas de correo con validación regex y flag de principal.
3. **`telefonos`**: Números de contacto fijos y móviles.
4. **`direcciones`**: Historial y domicilio actual con georreferenciación cantonal y parroquial.
5. **`biometricos`**: Repositorio de capturas fotográficas y registros dactilares.
6. **`nucleo_familiar`**: Vínculos de parentesco entre personas registradas (amparo familiar).
7. **`usuarios`**: Control de acceso basado en roles (RBAC) con hashes Bcrypt.
8. **`auditoria`**: Bitácora inmutable de eventos `CREATE`, `UPDATE` y `DELETE` con IP y timestamps.
9. **`solicitudes_pi`**: Expedientes de solicitud de asilo y protección internacional (Módulo 1).
10. **`visas_pi`**: Concesión formal de visas humanitarias para personas refugiadas.
11. **`beneficios`**: Acceso garantizado a salud, educación fiscal y trabajo formal.
12. **`movimientos`**: Registro cronológico de ingresos y salidas en puestos fronterizos y aeropuertos (Módulo 2).
13. **`alertas_consultadas`**: Trazabilidad de consultas contra listas de control e Interpol en frontera.
14. **`solicitudes_visa`**: Trámites de radicación para visas de residencia ordinarias (Módulo 3).
15. **`visas`**: Documentos electrónicos de visa aprobados y vigentes.
16. **`prorrogas`**: Extensiones reglamentarias de permanencia turística (hasta 90 días).
17. **`censos`**: Convocatorias y períodos oficiales de censo nacional (Módulo 4).
18. **`registros_censo`**: Empadronamiento biométrico con certificados únicos numerados.
19. **`regularizaciones`**: Títulos de regularización migratoria extraordinaria VIRTE.
20. **`catalogos`**: Parametría maestra del sistema (países ISO, medios de transporte, puestos fronterizos, etc.).
