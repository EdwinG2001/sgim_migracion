package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SolicitudPI representa una solicitud de refugio o protección internacional.
type SolicitudPI struct {
	ID                  primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID           primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	MotivoSalida        string             `bson:"motivo_salida" json:"motivo_salida"` // min:10, max:2000
	PaisOrigen          string             `bson:"pais_origen" json:"pais_origen"`     // ISO: 2 a 3 letras
	FechaIngresoEcuador time.Time          `bson:"fecha_ingreso_ecuador" json:"fecha_ingreso_ecuador"`
	Estado              string             `bson:"estado" json:"estado"` // en_tramite, aprobado, rechazado, archivado
	FechaSolicitud      time.Time          `bson:"fecha_solicitud" json:"fecha_solicitud"`
	CreatedAt           time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt           time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy           primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// VisaPI representa la visa humanitaria emitida una vez aprobada la protección internacional.
type VisaPI struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SolicitudPIID primitive.ObjectID `bson:"solicitud_pi_id" json:"solicitud_pi_id"`
	PersonaID     primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	NumeroVisa    string             `bson:"numero_visa" json:"numero_visa"` // min:5, max:30
	FechaEmision  time.Time          `bson:"fecha_emision" json:"fecha_emision"`
	FechaVigencia time.Time          `bson:"fecha_vigencia" json:"fecha_vigencia"`
	Estado        string             `bson:"estado" json:"estado"` // emitida, vencida, revocada
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
}

// Beneficio representa el derecho legal asignado a un solicitante o refugiado (salud, educación, etc.).
type Beneficio struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID       primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	TipoBeneficio   string             `bson:"tipo_beneficio" json:"tipo_beneficio"` // salud, educacion, trabajo, cedula
	FechaAsignacion time.Time          `bson:"fecha_asignacion" json:"fecha_asignacion"`
	Estado          string             `bson:"estado" json:"estado"` // activo, inactivo
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy       primitive.ObjectID `bson:"created_by" json:"created_by"`
}

