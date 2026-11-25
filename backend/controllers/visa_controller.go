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

type VisaController struct{}

func NewVisaController() *VisaController {
	return &VisaController{}
}

type SolicitarVisaDTO struct {
	PersonaID string `json:"persona_id"`
	TipoVisa  string `json:"tipo_visa"` // trabajo, estudios, inversion, amparo_familiar
}

type EmitirVisaOrdinariaDTO struct {
	SolicitudVisaID string `json:"solicitud_visa_id"`
	NumeroVisa      string `json:"numero_visa"`
	VigenciaAnios   int    `json:"vigencia_anios"` // por defecto 2 años
}

type SolicitarProrrogaDTO struct {
	PersonaID           string `json:"persona_id"`
	MovimientoIngresoID string `json:"movimiento_ingreso_id"`
	DiasExtension       int    `json:"dias_extension"` // hasta 90 días
}

// SolicitarVisa registra una nueva solicitud de visa ordinaria (RF-VIS-001)
func (c *VisaController) Solicitar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto SolicitarVisaDTO
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

	sol := models.SolicitudVisa{
		PersonaID:      pID,
		TipoVisa:       dto.TipoVisa,
		Estado:         "recibida",
		FechaSolicitud: now,
		CreatedAt:      now,
		UpdatedAt:      now,
		CreatedBy:      actorID,
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := db.Collection("solicitudes_visa").InsertOne(ctx, sol)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al crear solicitud de visa", err.Error())
		return
	}
	sol.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "solicitudes_visa", sol.ID, nil, sol, nil)

	views.RenderSuccess(w, http.StatusCreated, "Solicitud de visa registrada", sol)
}

// ListarSolicitudes consulta solicitudes de visa con paginación (RF-VIS-002)
func (c *VisaController) ListarSolicitudes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	estado := query.Get("estado")
	tipo := query.Get("tipo_visa")

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
	if tipo != "" {
		filter["tipo_visa"] = tipo
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("solicitudes_visa")

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

	var list []models.SolicitudVisa
	_ = cursor.All(ctx, &list)

	views.RenderPaginated(w, "Solicitudes de visa", list, page, limit, total)
}

// Emitir aprueba y emite oficialmente la visa ordinaria (RF-VIS-003, RF-VIS-004)
func (c *VisaController) Emitir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto EmitirVisaOrdinariaDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	solID, err := filters.ParseObjectID(dto.SolicitudVisaID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "solicitud_visa_id inválido")
		return
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	var sol models.SolicitudVisa
	err = db.Collection("solicitudes_visa").FindOne(ctx, bson.M{"_id": solID}).Decode(&sol)
	if err != nil {
		views.RenderError(w, http.StatusNotFound, "Solicitud de visa no encontrada")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	anios := dto.VigenciaAnios
	if anios <= 0 {
		anios = 2
	}
	vigencia := now.AddDate(anios, 0, 0)

	numVisa := dto.NumeroVisa
	if numVisa == "" {
		numVisa = fmt.Sprintf("VIS-%d-%s", time.Now().Year(), solID.Hex()[len(solID.Hex())-6:])
	}

	visa := models.Visa{
		SolicitudVisaID: solID,
		PersonaID:       sol.PersonaID,
		NumeroVisa:      numVisa,
		TipoVisa:        sol.TipoVisa,
		FechaEmision:    now,
		FechaVigencia:   vigencia,
		Estado:          "emitida",
		CreatedAt:       now,
	}

	res, err := db.Collection("visas").InsertOne(ctx, visa)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al emitir visa", err.Error())
		return
	}
	visa.ID = res.InsertedID.(primitive.ObjectID)

	_, _ = db.Collection("solicitudes_visa").UpdateOne(ctx, bson.M{"_id": solID}, bson.M{
		"$set": bson.M{
			"estado":     "emitida",
			"updated_at": now,
		},
	})

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "visas", visa.ID, nil, visa, nil)

	views.RenderSuccess(w, http.StatusCreated, "Visa emitida exitosamente", visa)
}

// Prorrogar registra la solicitud de prórroga turística (RF-VIS-005)
func (c *VisaController) Prorrogar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto SolicitarProrrogaDTO
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
	movID, err := filters.ParseObjectID(dto.MovimientoIngresoID)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "movimiento_ingreso_id inválido")
		return
	}

	dias := dto.DiasExtension
	if dias <= 0 || dias > 90 {
		dias = 90
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	vencOriginal := now
	nuevaFecha := now.AddDate(0, 0, dias)

	prorroga := models.Prorroga{
		PersonaID:                pID,
		MovimientoIngresoID:      movID,
		FechaSolicitud:           now,
		FechaVencimientoOriginal: vencOriginal,
		NuevaFechaVencimiento:    nuevaFecha,
		Estado:                   "aprobada",
		CreatedAt:                now,
		CreatedBy:                actorID,
	}

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := db.Collection("prorrogas").InsertOne(ctx, prorroga)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error al registrar prórroga", err.Error())
		return
	}
	prorroga.ID = res.InsertedID.(primitive.ObjectID)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "prorrogas", prorroga.ID, nil, prorroga, nil)

	views.RenderSuccess(w, http.StatusCreated, "Prórroga turística aprobada y registrada", prorroga)
}

type UpdateEstadoSolicitudVisaDTO struct {
	Estado        string `json:"estado"`        // recibida, en_revision, aprobada, rechazada, emitida
	Observaciones string `json:"observaciones"` // motivo u observaciones del analista
}

// ActualizarEstado permite a analista_visas y admin cambiar el estado (Aprobar, Rechazar, En Revisión/Aplazar)
func (c *VisaController) ActualizarEstado(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch && r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	idStr := r.PathValue("id")
	if idStr == "" {
		idStr = r.URL.Query().Get("id")
	}

	solID, err := filters.ParseObjectID(idStr)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "ID de solicitud inválido")
		return
	}

	var dto UpdateEstadoSolicitudVisaDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		views.RenderError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	estadosValidos := map[string]bool{
		"recibida":    true,
		"en_revision": true,
		"aprobada":    true,
		"rechazada":   true,
		"emitida":     true,
	}

	if !estadosValidos[dto.Estado] {
		views.RenderError(w, http.StatusBadRequest, "Estado inválido. Valores permitidos: recibida, en_revision, aprobada, rechazada, emitida")
		return
	}

	claims, _ := middlewares.GetUserFromContext(r)
	actorID, _ := filters.ParseObjectID(claims.UserID)

	db := config.GetDatabaseInstance()
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	coll := db.Collection("solicitudes_visa")

	var anterior models.SolicitudVisa
	if err := coll.FindOne(ctx, bson.M{"_id": solID}).Decode(&anterior); err != nil {
		views.RenderError(w, http.StatusNotFound, "Solicitud de visa no encontrada")
		return
	}

	now := time.Now().UTC().Truncate(time.Millisecond)
	updateFields := bson.M{
		"estado":     dto.Estado,
		"updated_at": now,
	}

	_, err = coll.UpdateOne(ctx, bson.M{"_id": solID}, bson.M{"$set": updateFields})
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error actualizando estado de solicitud de visa", err.Error())
		return
	}

	var actualizada models.SolicitudVisa
	_ = coll.FindOne(ctx, bson.M{"_id": solID}).Decode(&actualizada)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionUpdate, "solicitudes_visa", solID, anterior, actualizada, nil)

	views.RenderSuccess(w, http.StatusOK, fmt.Sprintf("Estado de solicitud de visa actualizado a '%s'", dto.Estado), actualizada)
}

