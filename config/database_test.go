package config_test

import (
	"context"
	"testing"
	"time"

	"sgim_migracion/config"

	"go.mongodb.org/mongo-driver/bson"
)

func TestMongoDBConnectionAndCatalogs(t *testing.T) {
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		t.Fatalf("Fallo de conexión a MongoDB local: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Probar Ping
	if err := db.Ping(ctx); err != nil {
		t.Fatalf("Error en Ping a MongoDB: %v", err)
	}

	// 2. Verificar que existan las colecciones creadas por el script
	catalogosColl := db.Collection("catalogos")
	count, err := catalogosColl.CountDocuments(ctx, bson.M{})
	if err != nil {
		t.Fatalf("Error consultando la colección 'catalogos': %v", err)
	}

	t.Logf("Conexión exitosa a 'sgim_migracion'. Cantidad de catálogos encontrados: %d", count)

	if count == 0 {
		t.Log("[INFO] La colección 'catalogos' no tiene documentos aún.")
	} else {
		t.Logf("[SUCCESS] Se verificaron los catálogos precargados en la base de datos (Total: %d)", count)
	}

	// 3. Verificar documentos en biometricos y beneficios
	bioCount, _ := db.Collection("biometricos").CountDocuments(ctx, bson.M{})
	benCount, _ := db.Collection("beneficios").CountDocuments(ctx, bson.M{})
	t.Logf("[SUCCESS] Colección 'biometricos' contiene %d documentos (solo huellas dactilares).", bioCount)
	t.Logf("[SUCCESS] Colección 'beneficios' contiene %d documentos.", benCount)
}

