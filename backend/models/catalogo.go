package models

import (
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Catalogo representa las opciones maestras parametrizadas del SGIM.
// Tipos: paises, tipos_visa, puntos_control, tipos_beneficio, motivos_pi, parentescos, medios_transporte.
// IMPORTANTE: Orden DEBE ser int32 para cumplir con bsonType: "int" en MongoDB JSON Schema.
type Catalogo struct {
	ID     primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Tipo   string             `bson:"tipo" json:"tipo"`
	Codigo string             `bson:"codigo" json:"codigo"`
	Nombre string             `bson:"nombre" json:"nombre"`
	Activo bool               `bson:"activo" json:"activo"`
	Orden  int32              `bson:"orden" json:"orden"` // int32 estricto
}

