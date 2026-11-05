package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/models"
	"sgim_migracion/models/filters"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type TeamMember struct {
	Nombres         string
	Apellidos       string
	NumeroDocumento string
	FechaNacimiento string // YYYY-MM-DD
	Sexo            string
	Username        string
	Password        string
	Rol             string
	IsAdmin         bool
}

func main() {
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		log.Fatalf("Error al conectar a MongoDB: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	now := time.Now().UTC().Truncate(time.Millisecond)

	members := []TeamMember{
		{
			Nombres:         "Edwin Guillermo",
			Apellidos:       "San Lucas Arroyo",
			NumeroDocumento: "0800000001",
			FechaNacimiento: "2001-01-01", // 25 años en 2026
			Sexo:            "M",
			Username:        "admin",
			Password:        "Admin2026*",
			Rol:             models.RolAdmin,
			IsAdmin:         true,
		},
		{
			Nombres:         "Josue Leonardo",
			Apellidos:       "Intriago Salazar",
			NumeroDocumento: "0804819203",
			FechaNacimiento: "2002-04-12", // 24 años en 2026
			Sexo:            "M",
			Username:        "intriagoofimi@gmail.com",
			Password:        "in12345",
			Rol:             models.RolOficialMigracion,
		},
		{
			Nombres:         "Milena Jazmin",
			Apellidos:       "Corozo Angulo",
			NumeroDocumento: "0803921845",
			FechaNacimiento: "2003-08-20", // 23 años en 2026
			Sexo:            "F",
			Username:        "corozoanalis@gmail.com",
			Password:        "co12345",
			Rol:             models.RolAnalistaPI,
		},
		{
			Nombres:         "Franklin Andres",
			Apellidos:       "Caisa Preciado",
			NumeroDocumento: "0805172938",
			FechaNacimiento: "2002-11-05", // 23 años en 2026
			Sexo:            "M",
			Username:        "caisavisas@gmail.com",
			Password:        "ca12345",
			Rol:             models.RolAnalistaVisas,
		},
		{
			Nombres:         "Lessly Jelena",
			Apellidos:       "Caicedo Medina",
			NumeroDocumento: "0806283914",
			FechaNacimiento: "2003-02-18", // 23 años en 2026
			Sexo:            "F",
			Username:        "caicedoregu@gmail.com",
			Password:        "les12345",
			Rol:             models.RolAnalistaRegularizacion,
		},
	}

	personasColl := db.Collection("personas")
	usuariosColl := db.Collection("usuarios")
	correosColl := db.Collection("correos")

	// Obtenemos el ID del admin inicial para el created_by
	var existingAdmin models.Usuario
	errAdmin := usuariosColl.FindOne(ctx, bson.M{"username": "admin"}).Decode(&existingAdmin)
	var adminCreatorID primitive.ObjectID
	if errAdmin == nil {
		adminCreatorID = existingAdmin.ID
	} else {
		adminCreatorID = primitive.NewObjectID()
	}

	fmt.Println("=============================================================")
	fmt.Println(" REGISTRANDO EQUIPO SGIM EN MONGO DB (sgim_migracion)")
	fmt.Println("=============================================================")

	for _, m := range members {
		fNac, err := time.Parse("2006-01-02", m.FechaNacimiento)
		if err != nil {
			log.Fatalf("Error parseando fecha para %s: %v", m.Nombres, err)
		}

		// 1. Verificar si la persona ya existe por número de documento
		var personaID primitive.ObjectID
		var persona models.Persona
		errFindP := personasColl.FindOne(ctx, bson.M{"numero_documento": m.NumeroDocumento}).Decode(&persona)
		if errFindP == nil {
			personaID = persona.ID
			fmt.Printf("[INFO] Persona ya existía: %s %s (%s)\n", m.Nombres, m.Apellidos, personaID.Hex())
		} else {
			persona = models.Persona{
				TipoDocumento:   "cedula",
				NumeroDocumento: m.NumeroDocumento,
				Nombres:         m.Nombres,
				Apellidos:       m.Apellidos,
				FechaNacimiento: filters.NormalizeUTC(fNac),
				Nacionalidad:    "ECU",
				Sexo:            m.Sexo,
				Estado:          "activo",
				CreatedAt:       now,
				UpdatedAt:       now,
				CreatedBy:       adminCreatorID,
			}

			resP, errInsP := personasColl.InsertOne(ctx, persona)
			if errInsP != nil {
				log.Fatalf("Error insertando persona %s %s: %v", m.Nombres, m.Apellidos, errInsP)
			}
			personaID = resP.InsertedID.(primitive.ObjectID)
			fmt.Printf("[OK] Persona registrada: %s %s (ID: %s)\n", m.Nombres, m.Apellidos, personaID.Hex())
		}

		// 1.1 Registrar correo si tiene formato email y no existe
		if m.Username != "admin" {
			countCorreo, _ := correosColl.CountDocuments(ctx, bson.M{"correo": m.Username})
			if countCorreo == 0 {
				correoDoc := models.Correo{
					PersonaID:   personaID,
					Correo:      m.Username,
					EsPrincipal: true,
					CreatedAt:   now,
				}
				_, _ = correosColl.InsertOne(ctx, correoDoc)
			}
		}

		// 2. Crear o actualizar la cuenta en usuarios
		var user models.Usuario
		errFindU := usuariosColl.FindOne(ctx, bson.M{"username": m.Username}).Decode(&user)
		if errFindU == nil {
			// Actualizar vinculación con persona_id
			_, errUp := usuariosColl.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{
				"$set": bson.M{
					"persona_id": personaID,
					"rol":        m.Rol,
					"updated_at": now,
				},
			})
			if errUp != nil {
				log.Fatalf("Error actualizando usuario %s: %v", m.Username, errUp)
			}
			fmt.Printf("[OK] Usuario actualizado: %s | Rol: %s (Vinculado a PersonaID: %s)\n", m.Username, m.Rol, personaID.Hex())
		} else {
			newUser := models.Usuario{
				Username:  m.Username,
				Rol:       m.Rol,
				PersonaID: &personaID,
				Estado:    "activo",
				CreatedAt: now,
				UpdatedAt: now,
			}
			if err := newUser.SetPassword(m.Password); err != nil {
				log.Fatalf("Error generando hash para %s: %v", m.Username, err)
			}

			resU, errInsU := usuariosColl.InsertOne(ctx, newUser)
			if errInsU != nil {
				log.Fatalf("Error insertando usuario %s: %v", m.Username, errInsU)
			}
			fmt.Printf("[OK] Usuario creado: %s | Rol: %s (ID: %s)\n", m.Username, m.Rol, resU.InsertedID.(primitive.ObjectID).Hex())
		}
	}

	fmt.Println("=============================================================")
	fmt.Println(" TODOS LOS INTEGRANTES FUERON REGISTRADOS EXITOSAMENTE")
	fmt.Println("=============================================================")
}

