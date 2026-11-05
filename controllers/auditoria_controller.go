package controllers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/models"
	"sgim_migracion/views"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type AuditoriaController struct{}

func NewAuditoriaController() *AuditoriaController {
	return &AuditoriaController{}
}

// Listar devuelve los registros de auditoría para el Administrador (RF-TR-003)
func (c *AuditoriaController) Listar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	query := r.URL.Query()
	coleccion := query.Get("coleccion")
	accion := query.Get("accion")

	page, _ := strconv.Atoi(query.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(query.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}

	filter := bson.M{}
	if coleccion != "" {
		filter["coleccion"] = coleccion
	}
	if accion != "" {
		filter["accion"] = accion
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("auditoria")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	total, _ := coll.CountDocuments(ctx, filter)

	skip := int64((page - 1) * limit)
	opts := options.Find().SetSkip(skip).SetLimit(int64(limit)).SetSort(bson.D{{Key: "fecha", Value: -1}})

	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando auditoría", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var list []models.Auditoria
	_ = cursor.All(ctx, &list)

	views.RenderPaginated(w, "Bitácora de auditoría inmutable", list, page, limit, total)
}

