package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/middlewares"
	"sgim_migracion/models"
	"sgim_migracion/models/filters"
	"sgim_migracion/views"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthController struct{}

func NewAuthController() *AuthController {
	return &AuthController{}
}

type LoginDTO struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type RegisterUserDTO struct {
	Username  string  `json:"username"`
	Password  string  `json:"password"`
	Rol       string  `json:"rol"`
	PersonaID *string `json:"persona_id,omitempty"`
}

// Login valida credenciales y devuelve el token JWT
func (c *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto LoginDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload JSON inválido")
		return
	}

	if dto.Username == "" || dto.Password == "" {
		views.RenderError(w, http.StatusBadRequest, "Usuario y contraseña son requeridos")
		return
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("usuarios")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var user models.Usuario
	err := coll.FindOne(ctx, bson.M{"username": dto.Username, "estado": "activo"}).Decode(&user)
	if err != nil {
		views.RenderError(w, http.StatusUnauthorized, "Credenciales incorrectas o usuario inactivo")
		return
	}

	if !user.CheckPassword(dto.Password) {
		views.RenderError(w, http.StatusUnauthorized, "Credenciales incorrectas")
		return
	}

	token, err := middlewares.GenerateJWT(user.ID, user.Username, user.Rol)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error generando token", err.Error())
		return
	}

	userMap := map[string]interface{}{
		"id":       user.ID.Hex(),
		"username": user.Username,
		"rol":      user.Rol,
	}

	if user.PersonaID != nil {
		userMap["persona_id"] = user.PersonaID.Hex()
		var p models.Persona
		if err := db.Collection("personas").FindOne(ctx, bson.M{"_id": *user.PersonaID}).Decode(&p); err == nil {
			userMap["nombres"] = p.Nombres
			userMap["apellidos"] = p.Apellidos
			userMap["numero_documento"] = p.NumeroDocumento
			userMap["nacionalidad"] = p.Nacionalidad
			userMap["tipo_documento"] = p.TipoDocumento
		}

		// Buscar teléfono principal
		var tel models.Telefono
		if err := db.Collection("telefonos").FindOne(ctx, bson.M{"persona_id": *user.PersonaID, "es_principal": true}).Decode(&tel); err == nil {
			userMap["telefono"] = tel.Numero
		}
	}

	views.RenderSuccess(w, http.StatusOK, "Autenticación exitosa", map[string]interface{}{
		"token": token,
		"user":  userMap,
	})
}

// Register crea un nuevo usuario del sistema (RF-TR-004)
func (c *AuthController) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto RegisterUserDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload JSON inválido")
		return
	}

	if len(dto.Username) < 4 || len(dto.Password) < 6 || dto.Rol == "" {
		views.RenderError(w, http.StatusBadRequest, "Datos incompletos: username (min 4), password (min 6), rol requerido")
		return
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("usuarios")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Verificar unicidad de username
	count, _ := coll.CountDocuments(ctx, bson.M{"username": dto.Username})
	if count > 0 {
		views.RenderError(w, http.StatusConflict, "El nombre de usuario ya está registrado")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	newUser := models.Usuario{
		Username:  dto.Username,
		Rol:       dto.Rol,
		Estado:    "activo",
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := newUser.SetPassword(dto.Password); err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error cifrando contraseña", err.Error())
		return
	}

	if dto.PersonaID != nil && *dto.PersonaID != "" {
		pID, err := filters.ParseObjectID(*dto.PersonaID)
		if err == nil {
			newUser.PersonaID = &pID
		}
	}

	res, err := coll.InsertOne(ctx, newUser)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error persistiendo usuario en MongoDB", err.Error())
		return
	}

	newID := res.InsertedID.(primitive.ObjectID)
	newUser.ID = newID

	// Auditoría
	claims, _ := middlewares.GetUserFromContext(r)
	actorID := newID
	if claims != nil {
		if aID, err := filters.ParseObjectID(claims.UserID); err == nil {
			actorID = aID
		}
	}
	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "usuarios", newID, nil, map[string]interface{}{"username": dto.Username, "rol": dto.Rol}, nil)

	views.RenderSuccess(w, http.StatusCreated, "Usuario creado exitosamente", map[string]interface{}{
		"id":       newID.Hex(),
		"username": newUser.Username,
		"rol":      newUser.Rol,
	})
}

// RegisterCitizenDTO es el formulario limpio para que cualquier extranjero/ciudadano cree su cuenta
type RegisterCitizenDTO struct {
	TipoDocumento   string `json:"tipo_documento"`
	NumeroDocumento string `json:"numero_documento"`
	Nombres         string `json:"nombres"`
	Apellidos       string `json:"apellidos"`
	FechaNacimiento string `json:"fecha_nacimiento"` // YYYY-MM-DD
	Nacionalidad    string `json:"nacionalidad"`     // ISO (VEN, COL, PER, etc.)
	Sexo            string `json:"sexo"`             // M, F, X
	Email           string `json:"email"`
	Password        string `json:"password"`
	Telefono        string `json:"telefono,omitempty"`
}

// RegisterCitizen crea la cuenta y perfil de un ciudadano SIN exigir ningún trámite aún
func (c *AuthController) RegisterCitizen(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto RegisterCitizenDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload JSON inválido", err.Error())
		return
	}

	// Validaciones de obligatoriedad
	dto.NumeroDocumento = strings.TrimSpace(dto.NumeroDocumento)
	dto.Nombres = strings.TrimSpace(dto.Nombres)
	dto.Apellidos = strings.TrimSpace(dto.Apellidos)
	dto.Email = strings.TrimSpace(dto.Email)

	if len(dto.NumeroDocumento) < 3 || dto.Nombres == "" || dto.Apellidos == "" || dto.Email == "" {
		views.RenderError(w, http.StatusBadRequest, "Datos obligatorios incompletos: documento, nombres, apellidos y email son requeridos")
		return
	}

	if len(dto.Password) < 6 {
		views.RenderError(w, http.StatusBadRequest, "La contraseña debe tener al menos 6 caracteres")
		return
	}

	fNac, err := time.Parse("2006-01-02", dto.FechaNacimiento)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Formato de fecha_nacimiento inválido. Use YYYY-MM-DD")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// 1. Verificar si el usuario ya existe
	usuariosColl := db.Collection("usuarios")
	countU, _ := usuariosColl.CountDocuments(ctx, bson.M{"username": dto.Email})
	if countU > 0 {
		views.RenderError(w, http.StatusConflict, "El correo electrónico ya está registrado en el sistema")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)

	// 2. Verificar o Crear Registro en 'personas'
	personasColl := db.Collection("personas")
	var persona models.Persona
	errFindP := personasColl.FindOne(ctx, bson.M{"numero_documento": dto.NumeroDocumento}).Decode(&persona)
	
	var personaID primitive.ObjectID
	if errFindP == nil {
		personaID = persona.ID
	} else {
		tipoDoc := strings.ToLower(strings.TrimSpace(dto.TipoDocumento))
		if tipoDoc != "pasaporte" && tipoDoc != "cedula" && tipoDoc != "documento_viaje" {
			tipoDoc = "otro"
		}

		sexo := strings.ToUpper(strings.TrimSpace(dto.Sexo))
		if sexo != "M" && sexo != "F" && sexo != "X" {
			sexo = "M"
		}

		nac := strings.ToUpper(strings.TrimSpace(dto.Nacionalidad))
		if len(nac) < 2 {
			nac = "VEN"
		}

		persona = models.Persona{
			TipoDocumento:   tipoDoc,
			NumeroDocumento: dto.NumeroDocumento,
			Nombres:         dto.Nombres,
			Apellidos:       dto.Apellidos,
			FechaNacimiento: filters.NormalizeUTC(fNac),
			Nacionalidad:    nac,
			Sexo:            sexo,
			Estado:          "activo",
			CreatedAt:       now,
			UpdatedAt:       now,
			CreatedBy:       primitive.NewObjectID(),
		}

		resP, errInsP := personasColl.InsertOne(ctx, persona)
		if errInsP != nil {
			views.RenderError(w, http.StatusBadRequest, "Error al registrar persona en MongoDB", errInsP.Error())
			return
		}
		personaID = resP.InsertedID.(primitive.ObjectID)
		persona.ID = personaID
	}

	// 3. Crear el Usuario (rol: solo_lectura / solicitante)
	newUser := models.Usuario{
		Username:  dto.Email,
		Rol:       models.RolSoloLectura,
		PersonaID: &personaID,
		Estado:    "activo",
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := newUser.SetPassword(dto.Password); err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error cifrando contraseña", err.Error())
		return
	}

	resU, errInsU := usuariosColl.InsertOne(ctx, newUser)
	if errInsU != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al crear cuenta de usuario", errInsU.Error())
		return
	}
	newUserID := resU.InsertedID.(primitive.ObjectID)
	newUser.ID = newUserID

	// 4. Guardar Correo en 'correos'
	correosColl := db.Collection("correos")
	_ , _ = correosColl.InsertOne(ctx, models.Correo{
		PersonaID:   personaID,
		Correo:      dto.Email,
		EsPrincipal: true,
		CreatedAt:   now,
	})

	// 5. Guardar Teléfono si fue ingresado
	if len(strings.TrimSpace(dto.Telefono)) >= 7 {
		telefonosColl := db.Collection("telefonos")
		_, _ = telefonosColl.InsertOne(ctx, models.Telefono{
			PersonaID:   personaID,
			Numero:      strings.TrimSpace(dto.Telefono),
			Tipo:        "movil",
			EsPrincipal: true,
			CreatedAt:   now,
		})
	}

	// 6. Generar Token JWT de autenticación inmediata
	token, err := middlewares.GenerateJWT(newUserID, newUser.Username, newUser.Rol)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error generando token de sesión", err.Error())
		return
	}

	// Auditoría
	_ = models.RegistrarAuditoria(ctx, newUserID, models.AccionCreate, "usuarios", newUserID, nil, map[string]interface{}{
		"username":   dto.Email,
		"rol":        newUser.Rol,
		"persona_id": personaID.Hex(),
	}, nil)

	views.RenderSuccess(w, http.StatusCreated, "Cuenta creada exitosamente", map[string]interface{}{
		"token": token,
		"user": map[string]interface{}{
			"id":         newUserID.Hex(),
			"username":   newUser.Username,
			"rol":        newUser.Rol,
			"persona_id": personaID.Hex(),
		},
		"persona": persona,
	})
}

// Profile devuelve la información completa del usuario y de su persona asociada
func (c *AuthController) Profile(w http.ResponseWriter, r *http.Request) {
	claims, err := middlewares.GetUserFromContext(r)
	if err != nil {
		views.RenderError(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	uID, _ := filters.ParseObjectID(claims.UserID)
	var user models.Usuario
	if err := db.Collection("usuarios").FindOne(ctx, bson.M{"_id": uID}).Decode(&user); err != nil {
		views.RenderError(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	response := map[string]interface{}{
		"id":         user.ID.Hex(),
		"username":   user.Username,
		"rol":        user.Rol,
		"estado":     user.Estado,
		"created_at": user.CreatedAt,
	}

	if user.PersonaID != nil {
		response["persona_id"] = user.PersonaID.Hex()
		var persona models.Persona
		if err := db.Collection("personas").FindOne(ctx, bson.M{"_id": *user.PersonaID}).Decode(&persona); err == nil {
			response["persona"] = persona
		}

		// Teléfonos
		curT, errT := db.Collection("telefonos").Find(ctx, bson.M{"persona_id": *user.PersonaID})
		if errT == nil {
			var tels []models.Telefono
			_ = curT.All(ctx, &tels)
			response["telefonos"] = tels
		}

		// Correos
		curC, errC := db.Collection("correos").Find(ctx, bson.M{"persona_id": *user.PersonaID})
		if errC == nil {
			var corrs []models.Correo
			_ = curC.All(ctx, &corrs)
			response["correos"] = corrs
		}
	}

	views.RenderSuccess(w, http.StatusOK, "Perfil recuperado", response)
}

type UpdatePhoneDTO struct {
	Telefono string `json:"telefono"`
}

// UpdatePhone actualiza o registra el teléfono principal del ciudadano en la colección telefonos
func (c *AuthController) UpdatePhone(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	claims, err := middlewares.GetUserFromContext(r)
	if err != nil {
		views.RenderError(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	var dto UpdatePhoneDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload inválido")
		return
	}

	dto.Telefono = strings.TrimSpace(dto.Telefono)
	if len(dto.Telefono) < 7 || len(dto.Telefono) > 20 {
		views.RenderError(w, http.StatusBadRequest, "El número de teléfono debe tener entre 7 y 20 caracteres")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	uID, _ := filters.ParseObjectID(claims.UserID)
	var user models.Usuario
	if err := db.Collection("usuarios").FindOne(ctx, bson.M{"_id": uID}).Decode(&user); err != nil || user.PersonaID == nil {
		views.RenderError(w, http.StatusBadRequest, "El usuario no tiene una persona asociada")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	telefonosColl := db.Collection("telefonos")

	// Desmarcar principal anterior
	_, _ = telefonosColl.UpdateMany(ctx, bson.M{"persona_id": *user.PersonaID}, bson.M{"$set": bson.M{"es_principal": false}})

	// Insertar nuevo teléfono principal cumpliendo el schema
	newTel := models.Telefono{
		PersonaID:   *user.PersonaID,
		Numero:      dto.Telefono,
		Tipo:        "movil",
		EsPrincipal: true,
		CreatedAt:   now,
	}
	_, errIns := telefonosColl.InsertOne(ctx, newTel)
	if errIns != nil {
		views.RenderError(w, http.StatusBadRequest, "Error registrando teléfono en MongoDB", errIns.Error())
		return
	}

	_ = models.RegistrarAuditoria(ctx, uID, models.AccionUpdate, "telefonos", *user.PersonaID, nil, map[string]interface{}{"telefono": dto.Telefono}, nil)

	views.RenderSuccess(w, http.StatusOK, "Teléfono actualizado exitosamente", map[string]string{
		"telefono": dto.Telefono,
	})
}

type ChangePasswordDTO struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// ChangePassword permite al usuario autenticado cambiar su contraseña
func (c *AuthController) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	claims, err := middlewares.GetUserFromContext(r)
	if err != nil {
		views.RenderError(w, http.StatusUnauthorized, "No autorizado")
		return
	}

	var dto ChangePasswordDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "Payload inválido")
		return
	}

	if len(dto.NewPassword) < 6 {
		views.RenderError(w, http.StatusBadRequest, "La nueva contraseña debe tener al menos 6 caracteres")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	uID, _ := filters.ParseObjectID(claims.UserID)
	var user models.Usuario
	if err := db.Collection("usuarios").FindOne(ctx, bson.M{"_id": uID}).Decode(&user); err != nil {
		views.RenderError(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	if !user.CheckPassword(dto.CurrentPassword) {
		views.RenderError(w, http.StatusBadRequest, "La contraseña actual es incorrecta")
		return
	}

	if err := user.SetPassword(dto.NewPassword); err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error cifrando nueva contraseña")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	_, errUpd := db.Collection("usuarios").UpdateOne(ctx, bson.M{"_id": uID}, bson.M{
		"$set": bson.M{
			"password_hash": user.PasswordHash,
			"updated_at":    now,
		},
	})
	if errUpd != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error actualizando contraseña", errUpd.Error())
		return
	}

	_ = models.RegistrarAuditoria(ctx, uID, models.AccionUpdate, "usuarios", uID, nil, map[string]interface{}{"cambio_clave": true}, nil)

	views.RenderSuccess(w, http.StatusOK, "Contraseña actualizada exitosamente", nil)
}

