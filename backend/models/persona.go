package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Persona representa el núcleo de identificación de cualquier ciudadano extranjero o usuario en el SGIM.
// Cumple estrictamente con el JSON Schema de la colección "personas" (additionalProperties: false).
type Persona struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	TipoDocumento   string             `bson:"tipo_documento" json:"tipo_documento"`     // pasaporte, cedula, documento_viaje, otro
	NumeroDocumento string             `bson:"numero_documento" json:"numero_documento"` // min:3, max:30
	Nombres         string             `bson:"nombres" json:"nombres"`                   // min:1, max:100
	Apellidos       string             `bson:"apellidos" json:"apellidos"`               // min:1, max:100
	FechaNacimiento time.Time          `bson:"fecha_nacimiento" json:"fecha_nacimiento"`
	Nacionalidad    string             `bson:"nacionalidad" json:"nacionalidad"`         // ISO 3 letras: VEN, COL, ECU
	Sexo            string             `bson:"sexo" json:"sexo"`                         // M, F, X
	Estado          string             `bson:"estado" json:"estado"`                     // activo, inactivo
	CreatedAt       time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt       time.Time          `bson:"updated_at" json:"updated_at"`
	CreatedBy       primitive.ObjectID `bson:"created_by" json:"created_by"`
}

// Correo almacena información de contacto vinculada a una Persona.
type Correo struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID   primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Correo      string             `bson:"correo" json:"correo"`
	EsPrincipal bool               `bson:"es_principal" json:"es_principal"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

// Telefono almacena líneas fijas o móviles de una Persona.
type Telefono struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID   primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Numero      string             `bson:"numero" json:"numero"`
	Tipo        string             `bson:"tipo" json:"tipo"` // movil, fijo
	EsPrincipal bool               `bson:"es_principal" json:"es_principal"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

// Direccion registra el domicilio y su historial dentro de Ecuador.
type Direccion struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID      primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Provincia      string             `bson:"provincia" json:"provincia"`
	Canton         string             `bson:"canton" json:"canton"`
	Parroquia      string             `bson:"parroquia" json:"parroquia"`
	CallePrincipal string             `bson:"calle_principal" json:"calle_principal"`
	EsActual       bool               `bson:"es_actual" json:"es_actual"`
	FechaDesde     time.Time          `bson:"fecha_desde" json:"fecha_desde"`
	CreatedAt      time.Time          `bson:"created_at" json:"created_at"`
}

// Biometrico almacena referencias de fotos o huellas dactilares.
type Biometrico struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID    primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	Tipo         string             `bson:"tipo" json:"tipo"` // foto, huella
	ArchivoURL   string             `bson:"archivo_url" json:"archivo_url"`
	FechaCaptura time.Time          `bson:"fecha_captura" json:"fecha_captura"`
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
}

// NucleoFamiliar establece relaciones familiares entre personas registradas.
type NucleoFamiliar struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	PersonaID         primitive.ObjectID `bson:"persona_id" json:"persona_id"`
	FamiliarPersonaID primitive.ObjectID `bson:"familiar_persona_id" json:"familiar_persona_id"`
	Parentesco        string             `bson:"parentesco" json:"parentesco"` // conyuge, hijo, hija, padre, madre, hermano, hermana, otro
	CreatedAt         time.Time          `bson:"created_at" json:"created_at"`
}

