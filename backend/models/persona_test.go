package models_test

import (
	"context"
	"testing"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/models"
	"sgim_migracion/models/filters"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestPersonaAndMovimientoStrictSchema(t *testing.T) {
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		t.Fatalf("Error conectando a BD: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now().UTC().Truncate(time.Millisecond)
	adminID := primitive.NewObjectID()

	// 1. Probar inserción de Persona con BSON Schema Estricto
	docNum := "TEST-" + primitive.NewObjectID().Hex()[:8]
	persona := models.Persona{
		TipoDocumento:   "pasaporte",
		NumeroDocumento: docNum,
		Nombres:         "Juan Carlos",
		Apellidos:       "Perez Rodriguez",
		FechaNacimiento: filters.NormalizeUTC(time.Date(1990, 5, 15, 0, 0, 0, 0, time.UTC)),
		Nacionalidad:    "VEN",
		Sexo:            "M",
		Estado:          "activo",
		CreatedAt:       now,
		UpdatedAt:       now,
		CreatedBy:       adminID,
	}

	resP, err := db.Collection("personas").InsertOne(ctx, persona)
	if err != nil {
		t.Fatalf("Fallo en validación estricta de 'personas': %v", err)
	}
	personaID := resP.InsertedID.(primitive.ObjectID)
	t.Logf("[SUCCESS] Persona insertada respetando strict JSON Schema con ID: %s", personaID.Hex())

	// 2. Probar inserción de Movimiento con DiasPermitidos como int32
	mov := models.Movimiento{
		PersonaID:       personaID,
		Tipo:            "ingreso",
		PuntoControl:    "UIO",
		FechaHora:       now,
		MedioTransporte: "aereo",
		MotivoViaje:     "turismo",
		RequiereVisa:    false,
		DiasPermitidos:  filters.IntToInt32(90), // BSON int 32 bits
		Estado:          "activo",
		CreatedAt:       now,
		CreatedBy:       adminID,
	}

	resM, err := db.Collection("movimientos").InsertOne(ctx, mov)
	if err != nil {
		t.Fatalf("Fallo en validación estricta de 'movimientos': %v", err)
	}
	movID := resM.InsertedID.(primitive.ObjectID)
	t.Logf("[SUCCESS] Movimiento insertado respetando strict JSON Schema (dias_permitidos=90) con ID: %s", movID.Hex())

	// 3. Probar inserción inmutable en Auditoria
	err = models.RegistrarAuditoria(ctx, adminID, models.AccionCreate, "personas", personaID, nil, persona, nil)
	if err != nil {
		t.Fatalf("Fallo en registro de auditoria: %v", err)
	}
	t.Log("[SUCCESS] Auditoría inmutable registrada correctamente.")

	// Limpieza de prueba
	_, _ = db.Collection("movimientos").DeleteOne(ctx, bson.M{"_id": movID})
	_, _ = db.Collection("personas").DeleteOne(ctx, bson.M{"_id": personaID})
	_, _ = db.Collection("auditoria").DeleteMany(ctx, bson.M{"documento_id": personaID})
}

