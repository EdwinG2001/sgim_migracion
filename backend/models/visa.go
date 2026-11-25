package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SolicitudVisa registra la petición formal de una visa ordinaria o de residencia.
type SolicitudVisa struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID      primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	TipoVisa       string             `bson:"tipo_visa" json:"tipo_visa"` // trabajo, estudios, inversion, amparo_familiar
	Estado         string             `bson:"estado" json:"estado"`       // recibida, en_revision, aprobada, rechazada, emitida
	FechaSolicitud time.Time          `bson:"fecha_solicitud" json:"fecha_solicitud"`
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt      time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy      primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// Visa representa la visa emitida oficialmente con número y vigencia.
type Visa struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SolicitudVisaID primitive.ObjectID `bson:"solicitud_visa_id" json:"solicitud_visa_id"`
	PersonaID       primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	NumeroVisa      string             `bson:"numero_visa" json:"numero_visa"` // min:5, max:30
	TipoVisa        string             `bson:"tipo_visa" json:"tipo_visa"`
	FechaEmision    time.Time          `bson:"fecha_emision" json:"fecha_emision"`
	FechaVigencia   time.Time          `bson:"fecha_vigencia" json:"fecha_vigencia"`
	Estado          string             `bson:"estado" json:"estado"` // emitida, vencida, revocada
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
}

// Prorroga gestiona la extensión de estadía turística (hasta 90 días adicionales).
type Prorroga struct {
	ID                       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID                primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	MovimientoIngresoID      primitive.ObjectID `bson:"movimiento_ingreso_id" json:"movimiento_ingreso_id"`
	FechaSolicitud           time.Time          `bson:"fecha_solicitud" json:"fecha_solicitud"`
	FechaVencimientoOriginal time.Time          `bson:"fecha_vencimiento_original" json:"fecha_vencimiento_original"`
	NuevaFechaVencimiento    time.Time          `bson:"nueva_fecha_vencimiento" json:"nueva_fecha_vencimiento"`
	Estado                   string             `bson:"estado" json:"estado"` // solicitada, aprobada, rechazada
	CreatedAt                time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy                primitive.ObjectID `bson:"created_by" json:"created_by"`
}

