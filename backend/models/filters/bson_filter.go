package filters

import (
	"fmt"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ParseObjectID convierte de forma segura un string en primitive.ObjectID.
// Retorna error amigable si el formato es inválido.
func ParseObjectID(idStr string) (primitive.ObjectID, error) {
	idStr = strings.TrimSpace(idStr)
	if idStr == "" {
		return primitive.NilObjectID, fmt.Errorf("el ID proporcionado está vacío")
	}
	objID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		return primitive.NilObjectID, fmt.Errorf("identificador '%s' no es un ObjectID válido", idStr)
	}
	return objID, nil
}

// NormalizeUTC trunca la fecha a milisegundos y la convierte a UTC
// para coincidir con el formato ISODate de MongoDB.
func NormalizeUTC(t time.Time) time.Time {
	if t.IsZero() {
		return time.Now().UTC().Truncate(time.Millisecond)
	}
	return t.UTC().Truncate(time.Millisecond)
}

// IntToInt32 asegura que los enteros pasados a MongoDB correspondan al tipo BSON 32-bit (int),
// evitando el error de validación donde Go por defecto serializaría como int64 (long).
func IntToInt32(val int) int32 {
	return int32(val)
}

// FilterActive retorna el filtro BSON estándar para registros activos (soft-delete).
func FilterActive() bson.M {
	return bson.M{"estado": "activo"}
}

// FilterByID retorna el filtro BSON para buscar por _id.
func FilterByID(id primitive.ObjectID) bson.M {
	return bson.M{"_id": id}
}

// FilterByPersonaID retorna el filtro BSON por referencia a persona.
func FilterByPersonaID(personaID primitive.ObjectID) bson.M {
	return bson.M{"persona_id": personaID}
}

// CleanUpdateDoc elimina campos que no deben ser sobreescritos en un $set
// para respetar additionalProperties: false y la inmutabilidad de _id y created_at.
func CleanUpdateDoc(updateData bson.M) bson.M {
	delete(updateData, "_id")
	delete(updateData, "created_at")
	delete(updateData, "created_by")
	updateData["updated_at"] = time.Now().UTC().Truncate(time.Millisecond)
	return updateData
}

