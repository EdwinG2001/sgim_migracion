package controllers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/middlewares"
	"sgim_migracion/models"
	"sgim_migracion/models/filters"
	"sgim_migracion/views"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PersonaController struct{}

func NewPersonaController() *PersonaController {
	return &PersonaController{}
}

type CreatePersonaDTO struct {
	TipoDocumento   string `json:"tipo_documento"`
	NumeroDocumento string `json:"numero_documento"`
	Nombres         string `json:"nombres"`
	Apellidos       string `json:"apellidos"`
	FechaNacimiento string `json:"fecha_nacimiento"` // YYYY-MM-DD
	Nacionalidad    string `json:"nacionalidad"`     // VEN, COL, etc.
	Sexo            string `json:"sexo"`             // M, F, X
}

// Create crea una nueva persona en el núcleo del SGIM
func (c *PersonaController) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto CreatePersonaDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, err := middlewares.GetUserFromContext(r)
	if err != nil {
		views.RenderError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}
	createdBy, _ := filters.ParseObjectID(claims.UserID)

	// Validar fecha
	fNac, err := time.Parse("2006-01-02", dto.FechaNacimiento)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Formato de fecha_nacimiento inválido. Use YYYY-MM-DD")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)

	// Modelo estricto BSON (evita incompatibilidad con additionalProperties: false)
	nuevaPersona := models.Persona{
		TipoDocumento:   strings.ToLower(strings.TrimSpace(dto.TipoDocumento)),
		NumeroDocumento: strings.TrimSpace(dto.NumeroDocumento),
		Nombres:         strings.TrimSpace(dto.Nombres),
		Apellidos:       strings.TrimSpace(dto.Apellidos),
		FechaNacimiento: filters.NormalizeUTC(fNac),
		Nacionalidad:    strings.ToUpper(strings.TrimSpace(dto.Nacionalidad)),
		Sexo:            strings.ToUpper(strings.TrimSpace(dto.Sexo)),
		Estado:          "activo",
		CreatedAt:       now,
		UpdatedAt:       now,
		CreatedBy:       createdBy,
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("personas")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := coll.InsertOne(ctx, nuevaPersona)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al guardar persona. Verifique validaciones de esquema", err.Error())
		return
	}

	nuevaPersona.ID = res.InsertedID.(primitive.ObjectID)

	// Registro de Auditoría
	_ = models.RegistrarAuditoria(ctx, createdBy, models.AccionCreate, "personas", nuevaPersona.ID, nil, nuevaPersona, nil)

	views.RenderSuccess(w, http.StatusCreated, "Persona registrada exitosamente", nuevaPersona)
}

// List lista personas con paginación y filtros de búsqueda (RF-PI-002 / transversal)
func (c *PersonaController) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	docNum := query.Get("numero_documento")
	nacionalidad := query.Get("nacionalidad")
	estado := query.Get("estado")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	filter := bson.M{}
	if estado != "" {
		filter["estado"] = estado
	} else {
		filter["estado"] = "activo"
	}
	if docNum != "" {
		filter["numero_documento"] = bson.M{"$regex": docNum, "$options": "i"}
	}
	if nacionalidad != "" {
		filter["nacionalidad"] = strings.ToUpper(nacionalidad)
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("personas")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := coll.CountDocuments(ctx, filter)

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando personas", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var personas []models.Persona
	if err := cursor.All(ctx, &personas); err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error decodificando personas", err.Error())
		return
	}

	views.RenderPaginated(w, "Personas recuperadas", personas, page, limit, total)
}

// GetByIDHandler maneja la ruta GET /api/personas/{id}
func (c *PersonaController) GetByIDHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}
	id := r.PathValue("id")
	if id == "" {
		id = r.URL.Query().Get("id")
	}
	c.GetByID(w, r, id)
}

// GetByID recupera el expediente completo de una persona con sus contactos y direcciones
func (c *PersonaController) GetByID(w http.ResponseWriter, r *http.Request, idStr string) {
	pID, err := filters.ParseObjectID(idStr)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "ID inválido", err.Error())
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var persona models.Persona
	err = db.Collection("personas").FindOne(ctx, bson.M{"_id": pID}).Decode(&persona)
	if err != nil {
		views.RenderError(w, http.StatusNotFound, "Persona no encontrada")
		return
	}

	// Consultar datos complementarios
	var correos []models.Correo
	cCur, _ := db.Collection("correos").Find(ctx, bson.M{"persona_id": pID})
	if cCur != nil {
		_ = cCur.All(ctx, &correos)
	}

	var telefonos []models.Telefono
	tCur, _ := db.Collection("telefonos").Find(ctx, bson.M{"persona_id": pID})
	if tCur != nil {
		_ = tCur.All(ctx, &telefonos)
	}

	var direcciones []models.Direccion
	dCur, _ := db.Collection("direcciones").Find(ctx, bson.M{"persona_id": pID})
	if dCur != nil {
		_ = dCur.All(ctx, &direcciones)
	}

	views.RenderSuccess(w, http.StatusOK, "Detalle de persona", map[string]interface{}{
		"persona":     persona,
		"correos":     correos,
		"telefonos":   telefonos,
		"direcciones": direcciones,
	})
}
