package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"golang.org/x/crypto/bcrypt"
)

// Roles del sistema según SRS y schema de MongoDB
const (
	RolAdmin                  = "admin"
	RolOficialMigracion       = "oficial_migracion"
	RolAnalistaPI             = "analista_pi"
	RolAnalistaVisas          = "analista_visas"
	RolAnalistaRegularizacion = "analista_regularizacion"
	RolSoloLectura            = "solo_lectura"
)

// Usuario representa un operador institucional o administrador del SGIM.
type Usuario struct {
	ID           primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	Username     string              `bson:"username" json:"username"`
	PasswordHash string              `bson:"password_hash" json:"-"`
	Rol          string              `bson:"rol" json:"rol"`
	PersonaID    *primitive.ObjectID `bson:"persona_id" json:"persona_id"` // Admite null según schema
	Estado       string              `bson:"estado" json:"estado"`         // activo, inactivo
	CreatedAt    time.Time           `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time           `bson:"updated_at" json:"updated_at"`
}

// SetPassword cifra la contraseña en texto plano usando bcrypt antes de persistirla.
func (u *Usuario) SetPassword(plainPassword string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashed)
	return nil
}

// CheckPassword compara una contraseña en texto plano contra el hash almacenado.
func (u *Usuario) CheckPassword(plainPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(plainPassword))
	return err == nil
}

