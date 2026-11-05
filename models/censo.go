package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Censo representa un proceso de censo migratorio convocado por el Estado.
type Censo struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Nombre      string             `bson:"nombre" json:"nombre"`           // min:5, max:150
	Descripcion string             `bson:"descripcion" json:"descripcion"` // min:10, max:1000
	FechaInicio time.Time          `bson:"fecha_inicio" json:"fecha_inicio"`
	FechaFin    time.Time          `bson:"fecha_fin" json:"fecha_fin"`
	Estado      string             `bson:"estado" json:"estado"` // abierto, cerrado
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy   primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// RegistroCenso es el comprobante emitido a una persona registrada voluntariamente en un censo.
type RegistroCenso struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	CensoID           primitive.ObjectID `bson:"censo_id" json:"censo_id"`
	PersonaID         primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	NumeroCertificado string             `bson:"numero_certificado" json:"numero_certificado"` // min:5, max:40
	FechaRegistro     time.Time          `bson:"fecha_registro" json:"fecha_registro"`
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy         primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// Regularizacion representa los procesos de amnistía migratoria (ej: visa VIRTE).
type Regularizacion struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID     primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Tipo          string             `bson:"tipo" json:"tipo"` // VIRTE, otra_amnistia
	NumeroVisa    string             `bson:"numero_visa" json:"numero_visa"`
	FechaEmision  time.Time          `bson:"fecha_emision" json:"fecha_emision"`
	FechaVigencia time.Time          `bson:"fecha_vigencia" json:"fecha_vigencia"`
	Estado        string             `bson:"estado" json:"estado"` // emitida, vencida, revocada
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy     primitive.ObjectID `bson:"created_by" json:"created_by"`
}

