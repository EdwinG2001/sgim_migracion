package routes

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"sgim_migracion/controllers"
	"sgim_migracion/middlewares"
	"sgim_migracion/models"
	"sgim_migracion/views"
)

// SetupRouter configura y registra todas las rutas del SGIM vinculando vistas y controladores (MVC)
func SetupRouter() http.Handler {
	mux := http.NewServeMux()

	// Controladores
	authCtrl := controllers.NewAuthController()
	personaCtrl := controllers.NewPersonaController()
	proteccionCtrl := controllers.NewProteccionController()
	movimientoCtrl := controllers.NewMovimientoController()
	visaCtrl := controllers.NewVisaController()
	censoCtrl := controllers.NewCensoController()
	catalogoCtrl := controllers.NewCatalogoController()
	auditCtrl := controllers.NewAuditoriaController()
	publicCtrl := controllers.NewPublicTramiteController()

	// Health Check
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		views.RenderSuccess(w, http.StatusOK, "SGIM API Backend Go funcionando correctamente", map[string]string{
			"status":  "healthy",
			"version": "1.0.0",
		})
	})

	// 0. Trámites y Solicitudes Ciudadanas (Manejo inteligente de sesión JWT + perfil MongoDB)
	mux.HandleFunc("POST /api/tramites/solicitar", publicCtrl.SolicitarTramite)
	mux.HandleFunc("GET /api/tramites/mis-tramites", publicCtrl.ListarMisTramites)
	mux.HandleFunc("GET /api/tramites/consulta-publica", publicCtrl.ConsultaPublica)

	// 1. Autenticación y Usuarios
	mux.HandleFunc("POST /api/auth/login", authCtrl.Login)
	mux.HandleFunc("POST /api/auth/register-citizen", authCtrl.RegisterCitizen) // Registro limpio de ciudadano
	mux.HandleFunc("POST /api/auth/update-phone", middlewares.AuthMiddleware(authCtrl.UpdatePhone))
	mux.HandleFunc("POST /api/auth/change-password", middlewares.AuthMiddleware(authCtrl.ChangePassword))
	mux.HandleFunc("POST /api/auth/register", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin)(authCtrl.Register),
	))
	mux.HandleFunc("GET /api/auth/profile", middlewares.AuthMiddleware(authCtrl.Profile))

	// 2. Núcleo Personas
	mux.HandleFunc("POST /api/personas", middlewares.AuthMiddleware(personaCtrl.Create))
	mux.HandleFunc("GET /api/personas", middlewares.AuthMiddleware(personaCtrl.List))
	mux.HandleFunc("GET /api/personas/{id}", middlewares.AuthMiddleware(personaCtrl.GetByIDHandler))

	// 3. Catálogos Maestros (Acceso público o con token)
	mux.HandleFunc("GET /api/catalogos", catalogoCtrl.Listar)

	// 4. Módulo 1: Protección Internacional y Refugio
	mux.HandleFunc("POST /api/proteccion/solicitudes", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaPI)(proteccionCtrl.CrearSolicitud),
	))
	mux.HandleFunc("GET /api/proteccion/solicitudes", middlewares.AuthMiddleware(proteccionCtrl.ListarSolicitudes))
	mux.HandleFunc("POST /api/proteccion/visas", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaPI)(proteccionCtrl.EmitirVisa),
	))
	mux.HandleFunc("POST /api/proteccion/beneficios", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaPI)(proteccionCtrl.AsignarBeneficio),
	))

	// 5. Módulo 2: Control de Movimiento Migratorio
	mux.HandleFunc("POST /api/movimientos", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolOficialMigracion)(movimientoCtrl.Registrar),
	))
	mux.HandleFunc("GET /api/movimientos", middlewares.AuthMiddleware(movimientoCtrl.Listar))

	// 6. Módulo 3: Emisión y Prórroga de Visas de Residencia
	mux.HandleFunc("POST /api/visas/solicitudes", middlewares.AuthMiddleware(visaCtrl.Solicitar))
	mux.HandleFunc("GET /api/visas/solicitudes", middlewares.AuthMiddleware(visaCtrl.ListarSolicitudes))
	mux.HandleFunc("POST /api/visas/emitir", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaVisas)(visaCtrl.Emitir),
	))
	mux.HandleFunc("POST /api/visas/prorrogas", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaVisas)(visaCtrl.Prorrogar),
	))

	// 7. Módulo 4: Regularización y Censos Migratorios
	mux.HandleFunc("POST /api/censos", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaRegularizacion)(censoCtrl.Crear),
	))
	mux.HandleFunc("POST /api/censos/registro", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaRegularizacion)(censoCtrl.Registrar),
	))
	mux.HandleFunc("GET /api/censos/registros", middlewares.AuthMiddleware(censoCtrl.ListarCensados))
	mux.HandleFunc("POST /api/regularizacion/virte", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin, models.RolAnalistaRegularizacion)(censoCtrl.RegularizarVIRTE),
	))

	// 8. Bitácora de Auditoría (Exclusivo Administrador)
	mux.HandleFunc("GET /api/auditoria", middlewares.AuthMiddleware(
		middlewares.RequireRoles(models.RolAdmin)(auditCtrl.Listar),
	))

	// 9. Servir Frontend React (SPA) unificado desde ./frontend/dist o ./dist
	distDir := "./frontend/dist"
	if _, err := os.Stat(distDir); os.IsNotExist(err) {
		if _, errRoot := os.Stat("./dist"); errRoot == nil {
			distDir = "./dist"
		}
	}

	fs := http.FileServer(http.Dir(distDir))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		// Si la ruta empieza con /api/, devolver 404 JSON si no coincidió con ninguna ruta de API
		if strings.HasPrefix(r.URL.Path, "/api/") {
			views.RenderError(w, http.StatusNotFound, "Endpoint API no encontrado")
			return
		}

		// Si el directorio no existe (ej. antes de compilar el frontend)
		if _, err := os.Stat(distDir); os.IsNotExist(err) {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("Servidor SGIM Backend Go activo. Para ver la interfaz web, ejecute 'npm run build' en la raíz."))
			return
		}

		// Si es un archivo estático existente (.js, .css, .svg, .ico, /assets/...)
		cleanPath := filepath.Clean(r.URL.Path)
		filePath := filepath.Join(distDir, cleanPath)
		if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
			fs.ServeHTTP(w, r)
			return
		}

		// Para cualquier otra ruta de la SPA (/tramites, /requisitos, /), entregar index.html
		http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
	})

	// Retorna router envuelto con middleware de CORS
	return middlewares.CORSMiddleware(mux)
}

