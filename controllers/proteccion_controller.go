package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
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

type ProteccionController struct{}

func NewProteccionController() *ProteccionController {
	return &ProteccionController{}
}

type CreateSolicitudPIDTO struct {
	PersonaID           string `json:"persona_id"`
	MotivoSalida        string `json:"motivo_salida"`
	PaisOrigen          string `json:"pais_origen"`
	FechaIngresoEcuador string `json:"fecha_ingreso_ecuador"` // YYYY-MM-DD
}

type EmitirVisaPIDTO struct {
	SolicitudPIID string `json:"solicitud_pi_id"`
	NumeroVisa    string `json:"numero_visa"`
	VigenciaMeses int    `json:"vigencia_meses"` // por defecto 24 meses
}

type AsignarBeneficioDTO struct {
	PersonaID     string `json:"persona_id"`
	TipoBeneficio string `json:"tipo_beneficio"` // salud, educacion, trabajo, cedula
}

// CrearSolicitud registra una petición formal de refugio (RF-PI-001)
func (c *ProteccionController) CrearSolicitud(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto CreateSolicitudPIDTO
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

	pID, err := filters.ParseObjectID(dto.PersonaID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "persona_id inválido", err.Error())
		return
	}

	fIngreso, err := time.Parse("2006-01-02", dto.FechaIngresoEcuador)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Formato fecha_ingreso_ecuador inválido. Use YYYY-MM-DD")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)

	solicitud := models.SolicitudPI{
		PersonaID:           pID,
		MotivoSalida:        dto.MotivoSalida,
		PaisOrigen:          dto.PaisOrigen,
		FechaIngresoEcuador: filters.NormalizeUTC(fIngreso),
		Estado:              "en_tramite",
		FechaSolicitud:      now,
		CreatedAt:           now,
		UpdatedAt:           now,
		CreatedBy:           createdBy,
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("solicitudes_pi")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := coll.InsertOne(ctx, solicitud)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al registrar solicitud de protección", err.Error())
		return
	}

	solicitud.ID = res.InsertedID.(primitive.ObjectID)

	// Auditoría
	_ = models.RegistrarAuditoria(ctx, createdBy, models.AccionCreate, "solicitudes_pi", solicitud.ID, nil, solicitud, nil)

	views.RenderSuccess(w, http.StatusCreated, "Solicitud de protección internacional registrada", solicitud)
}

// ListarSolicitudes consulta solicitudes con paginación y estado (RF-PI-002)
func (c *ProteccionController) ListarSolicitudes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	estado := query.Get("estado")
	pais := query.Get("pais_origen")

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
	}
	if pais != "" {
		filter["pais_origen"] = pais
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("solicitudes_pi")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := coll.CountDocuments(ctx, filter)

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando solicitudes", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var list []models.SolicitudPI
	_ = cursor.All(ctx, &list)

	views.RenderPaginated(w, "Solicitudes de protección internacional", list, page, limit, total)
}

// EmitirVisa aprueba y genera la visa humanitaria por protección internacional (RF-PI-004)
func (c *ProteccionController) EmitirVisa(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto EmitirVisaPIDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	solID, err := filters.ParseObjectID(dto.SolicitudPIID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "solicitud_pi_id inválido")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var sol models.SolicitudPI
	err = db.Collection("solicitudes_pi").FindOne(ctx, bson.M{"_id": solID}).Decode(&sol)
	if err != nil {
		views.RenderError(w, http.StatusNotFound, "Solicitud de protección internacional no encontrada")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	meses := dto.VigenciaMeses
	if meses <= 0 {
		meses = 24
	}
	vigencia := now.AddDate(0, meses, 0)

	numVisa := dto.NumeroVisa
	if numVisa == "" {
		numVisa = fmt.Sprintf("VPI-%d-%s", time.Now().Year(), solID.Hex()[len(solID.Hex())-6:])
	}

	visa := models.VisaPI{
		SolicitudPIID: solID,
		PersonaID:     sol.PersonaID,
		NumeroVisa:    numVisa,
		FechaEmision:  now,
		FechaVigencia: vigencia,
		Estado:        "emitida",
		CreatedAt:     now,
	}

	res, err := db.Collection("visas_pi").InsertOne(ctx, visa)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al emitir visa de protección internacional", err.Error())
		return
	}
	visa.ID = res.InsertedID.(primitive.ObjectID)

	// Actualizar estado de la solicitud a "aprobado"
	_, _ = db.Collection("solicitudes_pi").UpdateOne(ctx, bson.M{"_id": solID}, bson.M{
		"$set": bson.M{
			"estado":     "aprobado",
			"updated_at": now,
		},
	})

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "visas_pi", visa.ID, nil, visa, nil)

	views.RenderSuccess(w, http.StatusCreated, "Visa de protección internacional emitida exitosamente", visa)
}

// AsignarBeneficio vincula derechos reconocidos al refugiado (RF-PI-006)
func (c *ProteccionController) AsignarBeneficio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto AsignarBeneficioDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	pID, err := filters.ParseObjectID(dto.PersonaID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "persona_id inválido")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	beneficio := models.Beneficio{
		PersonaID:       pID,
		TipoBeneficio:   dto.TipoBeneficio,
		FechaAsignacion: now,
		Estado:          "activo",
		CreatedAt:       now,
		CreatedBy:       actorID,
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := db.Collection("beneficios").InsertOne(ctx, beneficio)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error registrando beneficio", err.Error())
		return
	}
	beneficio.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "beneficios", beneficio.ID, nil, beneficio, nil)

	views.RenderSuccess(w, http.StatusCreated, "Beneficio asignado", beneficio)
}

