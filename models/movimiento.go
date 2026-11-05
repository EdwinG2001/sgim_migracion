package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Movimiento representa un registro migratorio oficial de ingreso o salida en frontera o aeropuerto.
// IMPORTANTE: DiasPermitidos DEBE ser int32 para cumplir con bsonType: "int" en MongoDB JSON Schema.
type Movimiento struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID       primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Tipo            string             `bson:"tipo" json:"tipo"` // ingreso, salida
	PuntoControl    string             `bson:"punto_control" json:"punto_control"`
	FechaHora       time.Time          `bson:"fecha_hora" json:"fecha_hora"`
	MedioTransporte string             `bson:"medio_transporte" json:"medio_transporte"` // aereo, terrestre, maritimo, fluvial
	MotivoViaje     string             `bson:"motivo_viaje" json:"motivo_viaje"`
	RequiereVisa    bool               `bson:"requiere_visa" json:"requiere_visa"`
	DiasPermitidos  int32              `bson:"dias_permitidos" json:"dias_permitidos"` // int32 estricto (0 a 365)
	Estado          string             `bson:"estado" json:"estado"`                   // activo, anulado
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	CreatedBy       primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// AlertaConsultada almacena el resultado de la consulta de impedimentos o antecedentes (simulando Interpol/Policía).
type AlertaConsultada struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MovimientoID  primitive.ObjectID `bson:"movimiento_id" json:"movimiento_id"`
	PersonaID     primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	TieneAlerta   bool               `bson:"tiene_alerta" json:"tiene_alerta"`
	DetalleAlerta *string            `bson:"detalle_alerta" json:"detalle_alerta"` // string o null
	Fuente        string             `bson:"fuente" json:"fuente"`                 // mock_interpol, policial, otro
	FechaConsulta time.Time          `bson:"fecha_consulta" json:"fecha_consulta"`
}

