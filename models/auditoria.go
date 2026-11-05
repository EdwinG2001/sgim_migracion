package models

import (
	"context"
	"time"

	"sgim_migracion/config"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const (
	AccionCreate = "CREATE"
	AccionUpdate = "UPDATE"
	AccionDelete = "DELETE"
)

// Auditoria registra la trazabilidad inmutable de todas las operaciones críticas (quién, qué, cuándo).
// Cumple estrictamente con el JSON Schema de la colección "auditoria".
type Auditoria struct {
	ID                primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UsuarioID         primitive.ObjectID  `bson:"usuario_id" json:"usuario_id"`
	Accion            string              `bson:"accion" json:"accion"` // CREATE, UPDATE, DELETE
	Coleccion         string              `bson:"coleccion" json:"coleccion"`
	DocumentoID       primitive.ObjectID  `bson:"documento_id" json:"documento_id"`
	ValoresAnteriores interface{}         `bson:"valores_anteriores" json:"valores_anteriores"` // object o null
	ValoresNuevos     interface{}         `bson:"valores_nuevos" json:"valores_nuevos"`         // object o null
	Fecha             time.Time           `bson:"fecha" json:"fecha"`
	IP                *string             `bson:"ip" json:"ip"` // string o null
}

// RegistrarAuditoria inserta un registro inmutable en la colección "auditoria".
func RegistrarAuditoria(ctx context.Context, usuarioID primitive.ObjectID, accion, coleccion string, docID primitive.ObjectID, valoresPrevios, valoresNuevos interface{}, ip *string) error {
	db := config.GetDatabaseInstance()
	coll := db.Collection("auditoria")

	registro := Auditoria{
		UsuarioID:         usuarioID,
		Accion:            accion,
		Coleccion:         coleccion,
		DocumentoID:       docID,
		ValoresAnteriores: valoresPrevios,
		ValoresNuevos:     valoresNuevos,
		Fecha:             time.Now().UTC().Truncate(time.Millisecond),
		IP:                ip,
	}

	_, err := coll.InsertOne(ctx, registro)
	return err
}

