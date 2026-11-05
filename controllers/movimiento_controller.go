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

type MovimientoController struct{}

func NewMovimientoController() *MovimientoController {
	return &MovimientoController{}
}

type RegistrarMovimientoDTO struct {
	PersonaID       string `json:"persona_id"`
	Tipo            string `json:"tipo"`             // ingreso, salida
	PuntoControl    string `json:"punto_control"`    // UIO, GYE, RUM, HUA, etc.
	MedioTransporte string `json:"medio_transporte"` // aereo, terrestre, maritimo, fluvial
	MotivoViaje     string `json:"motivo_viaje"`     // turismo, trabajo, retorno, etc.
	RequiereVisa    bool   `json:"requiere_visa"`
	DiasPermitidos  int    `json:"dias_permitidos"` // 90 para turistas
}

// RegistrarIngresoSalida registra el paso migratorio en frontera o aeropuerto (RF-MM-001, RF-MM-002)
func (c *MovimientoController) Registrar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	var dto RegistrarMovimientoDTO
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

	tipo := strings.ToLower(strings.TrimSpace(dto.Tipo))
	if tipo != "ingreso" && tipo != "salida" {
		views.RenderError(w, http.StatusBadRequest, "tipo debe ser 'ingreso' o 'salida'")
		return
	}

	// Regla de negocio migratoria: por defecto si ingresa como turista sin visa previa se conceden 90 días
	dias := dto.DiasPermitidos
	if tipo == "ingreso" && dias <= 0 {
		dias = 90
	}
	if tipo == "salida" {
		dias = 0
	}

	now := time.Now().UTC().Truncate(time.Millisecond)

	// IMPORTANTE: dias_permitidos convertido a int32 estricto para evitar incompatibilidad con schema de MongoDB
	mov := models.Movimiento{
		PersonaID:       pID,
		Tipo:            tipo,
		PuntoControl:    dto.PuntoControl,
		FechaHora:       now,
		MedioTransporte: dto.MedioTransporte,
		MotivoViaje:     dto.MotivoViaje,
		RequiereVisa:    dto.RequiereVisa,
		DiasPermitidos:  filters.IntToInt32(dias),
		Estado:          "activo",
		CreatedAt:       now,
		CreatedBy:       actorID,
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("movimientos")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	res, err := coll.InsertOne(ctx, mov)
	if err != nil {
		views.RenderError(w, http.StatusBadRequest, "Error registrando movimiento migratorio", err.Error())
		return
	}
	mov.ID = res.InsertedID.(primitive.ObjectID)

	// RF-MM-005: Mock de consulta de alertas de seguridad (Interpol / bases policiales)
	alerta := models.AlertaConsultada{
		MovimientoID:  mov.ID,
		PersonaID:     pID,
		TieneAlerta:   false,
		DetalleAlerta: nil,
		Fuente:        "mock_interpol",
		FechaConsulta: now,
	}
	_, _ = db.Collection("alertas_consultadas").InsertOne(ctx, alerta)

	_ = models.RegistrarAuditoria(ctx, actorID, models.AccionCreate, "movimientos", mov.ID, nil, mov, nil)

	views.RenderSuccess(w, http.StatusCreated, "Movimiento migratorio registrado", map[string]interface{}{
		"movimiento": mov,
		"alerta":     alerta,
	})
}

// Listar consulta el historial de movimientos migratorios (RF-MM-003)
func (c *MovimientoController) Listar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	pIDStr := query.Get("persona_id")
	tipo := query.Get("tipo")
	punto := query.Get("punto_control")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	filter := bson.M{"estado": "activo"}
	if pIDStr != "" {
		if pid, err := filters.ParseObjectID(pIDStr); err == nil {
			filter["persona_id"] = pid
		}
	}
	if tipo != "" {
		filter["tipo"] = tipo
	}
	if punto != "" {
		filter["punto_control"] = punto
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("movimientos")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := coll.CountDocuments(ctx, filter)

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "fecha_hora", Value: -1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando movimientos", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var list []models.Movimiento
	_ = cursor.All(ctx, &list)

	views.RenderPaginated(w, "Movimientos migratorios", list, page, limit, total)
}

