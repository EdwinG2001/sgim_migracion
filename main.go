package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/models"
	"sgim_migracion/routes"

	"go.mongodb.org/mongo-driver/bson"
)

func main() {
	log.Println("=============================================================")
	log.Println(" SGIM - Sistema de Gestión Integral Migratoria (Ecuador)")
	log.Println(" Backend en Go (Golang) - Arquitectura MVC")
	log.Println("=============================================================")

	// 1. Inicializar conexión a MongoDB
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		log.Fatalf("[FATAL] No se pudo conectar a MongoDB: %v", err)
	}

	// 2. Sembrar usuario inicial Admin si la colección está vacía
	bootstrapAdmin(db)

	// 3. Configurar router y endpoints
	handler := routes.SetupRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 4. Iniciar servidor en goroutine
	go func() {
		log.Printf("[HTTP] Servidor SGIM Unificado escuchando en: http://localhost:%s\n", port)
		log.Printf("[HTTP] -> Ventanilla Digital (Frontend Web): http://localhost:%s/\n", port)
		log.Printf("[HTTP] -> APIs REST SGIM (Backend Go):       http://localhost:%s/api/\n", port)
		log.Printf("[HTTP] -> Health Check:                     http://localhost:%s/api/health\n", port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("[FATAL] Fallo en servidor HTTP: %v", err)
		}
	}()

	// 5. Manejo de Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM, os.Interrupt)
	<-quit

	log.Println("\n[SHUTDOWN] Señal de apagado recibida. Cerrando recursos ordenadamente...")

	ctxShutdown, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := server.Shutdown(ctxShutdown); err != nil {
		log.Printf("[ERROR] Error durante el apagado del servidor HTTP: %v", err)
	}

	if err := db.Disconnect(ctxShutdown); err != nil {
		log.Printf("[ERROR] Error cerrando conexión MongoDB: %v", err)
	}

	log.Println("[SHUTDOWN] Servidor SGIM apagado exitosamente.")
}

// bootstrapAdmin verifica si existe al menos un usuario; si no, crea el admin inicial
func bootstrapAdmin(db *config.Database) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	coll := db.Collection("usuarios")
	count, err := coll.CountDocuments(ctx, bson.M{})
	if err != nil {
		log.Printf("[WARN] No se pudo verificar existencia de usuarios: %v", err)
		return
	}

	if count == 0 {
		now := time.Now().UTC().Truncate(time.Millisecond)
		admin := models.Usuario{
			Username:  "admin",
			Rol:       models.RolAdmin,
			PersonaID: nil,
			Estado:    "activo",
			CreatedAt: now,
			UpdatedAt: now,
		}
		_ = admin.SetPassword("Admin2026*")

		res, err := coll.InsertOne(ctx, admin)
		if err != nil {
			log.Printf("[WARN] Error creando usuario admin inicial: %v", err)
		} else {
			fmt.Println("-------------------------------------------------------------")
			log.Printf("[BOOTSTRAP] Usuario inicial 'admin' creado automáticamente.")
			log.Printf("[BOOTSTRAP] Usuario: admin | Contraseña: Admin2026* | ID: %v", res.InsertedID)
			fmt.Println("-------------------------------------------------------------")
		}
	}
}

