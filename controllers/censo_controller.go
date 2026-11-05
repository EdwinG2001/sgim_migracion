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

type CensoController struct{}

func NewCensoController() *CensoController {
	return &CensoController{}
}

type CrearCensoDTO struct {
	Nombre      string `json:"nombre"`
	Descripcion string `json:"descripcion"`
	FechaInicio string `json:"fecha_inicio"` // YYYY-MM-DD
	FechaFin    string `json:"fecha_fin"`    // YYYY-MM-DD
}

type RegistrarCensoDTO struct {
	CensoID   string `json:"censo_id"`
	PersonaID string `json:"persona_id"`
}

type RegularizacionVIRTEDTO struct {
	PersonaID     string `json:"persona_id"`
	Tipo          string `json:"tipo"` // VIRTE, otra_amnistia
	NumeroVisa    string `json:"numero_visa"`
	VigenciaMeses int    `json:"vigencia_meses"` // ej: 24 meses
}

// CrearCenso apertura un nuevo proceso censal (RF-REG-001)
func (c *CensoController) Crear(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto CrearCensoDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	fIni, err := time.Parse("2006-01-02", dto.FechaInicio)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "fecha_inicio inválida (YYYY-MM-DD)")
		return
	}
	fFin, err := time.Parse("2006-01-02", dto.FechaFin)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "fecha_fin inválida (YYYY-MM-DD)")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)

	censo := models.Censo{
		Nombre:      dto.Nombre,
		Descripcion: dto.Descripcion,
		FechaInicio: filters.NormalizeUTC(fIni),
		FechaFin:    filters.NormalizeUTC(fFin),
		Estado:      "abierto",
		CreatedAt:   now,
		CreatedBy:   actorID,
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := db.Collection("censos").InsertOne(ctx, censo)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al crear censo migratorio", err.Error())
		return
	}
	censo.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "censos", censo.ID, nil, censo, nil)

	views.RenderSuccess(w, http.StatusCreated, "Censo migratorio aperturado", censo)
}

// RegistrarEnCenso registra a un ciudadano no regularizado emitiendo certificado (RF-REG-002)
func (c *CensoController) Registrar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto RegistrarCensoDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	cID, err := filters.ParseObjectID(dto.CensoID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "censo_id inválido")
		return
	}
	pID, err := filters.ParseObjectID(dto.PersonaID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "persona_id inválido")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Validar que el censo exista y esté abierto
	var censo models.Censo
	err = db.Collection("censos").FindOne(ctx, bson.M{"_id": cID, "estado": "abierto"}).Decode(&censo)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "El censo no existe o se encuentra cerrado")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	numCert := fmt.Sprintf("CERT-CEN-%d-%s", time.Now().Year(), pID.Hex()[len(pID.Hex())-6:])

	reg := models.RegistroCenso{
		CensoID:           cID,
		PersonaID:         pID,
		NumeroCertificado: numCert,
		FechaRegistro:     now,
		CreatedAt:         now,
		CreatedBy:         actorID,
	}

	res, err := db.Collection("registros_censo").InsertOne(ctx, reg)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al registrar persona en censo (posible duplicado)", err.Error())
		return
	}
	reg.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "registros_censo", reg.ID, nil, reg, nil)

	views.RenderSuccess(w, http.StatusCreated, "Certificado de registro de censo emitido", reg)
}

// RegularizarVIRTE procesa una amnistía extraordinaria otorgando visa VIRTE (RF-REG-004)
func (c *CensoController) RegularizarVIRTE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto RegularizacionVIRTEDTO
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

	tipo := dto.Tipo
	if tipo == "" {
		tipo = "VIRTE"
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	meses := dto.VigenciaMeses
	if meses <= 0 {
		meses = 24
	}
	vigencia := now.AddDate(0, meses, 0)

	numVisa := dto.NumeroVisa
	if numVisa == "" {
		numVisa = fmt.Sprintf("VIRTE-%d-%s", time.Now().Year(), pID.Hex()[len(pID.Hex())-6:])
	}

	reg := models.Regularizacion{
		PersonaID:     pID,
		Tipo:          tipo,
		NumeroVisa:    numVisa,
		FechaEmision:  now,
		FechaVigencia: vigencia,
		Estado:        "emitida",
		CreatedAt:     now,
		CreatedBy:     actorID,
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := db.Collection("regularizaciones").InsertOne(ctx, reg)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al registrar visa de regularización", err.Error())
		return
	}
	reg.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "regularizaciones", reg.ID, nil, reg, nil)

	views.RenderSuccess(w, http.StatusCreated, "Visa de regularización VIRTE emitida", reg)
}

// ListarCensados lista los registros de un censo (RF-REG-003)
func (c *CensoController) ListarCensados(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	censoIDStr := query.Get("censo_id")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	filter := bson.M{}
	if censoIDStr != "" {
		if cid, err := filters.ParseObjectID(censoIDStr); err == nil {
			filter["censo_id"] = cid
		}
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("registros_censo")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := coll.CountDocuments(ctx, filter)

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando censados", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var list []models.RegistroCenso
	_ = cursor.All(ctx, &list)

	views.RenderPaginated(w, "Registros de censo", list, page, limit, total)
}

