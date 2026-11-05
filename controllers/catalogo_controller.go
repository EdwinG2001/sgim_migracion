package controllers

import (
	"context"
	"net/http"
	"time"

	"sgim_migracion/config"
	"sgim_migracion/models"
	"sgim_migracion/views"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type CatalogoController struct{}

func NewCatalogoController() *CatalogoController {
	return &CatalogoController{}
}

// Listar devuelve los catálogos maestros activos ordenados (RF-TR-005)
func (c *CatalogoController) Listar(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		views.RenderError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	tipo := r.URL.Query().Get("tipo")

	filter := bson.M{"activo": true}
	if tipo != "" {
		filter["tipo"] = tipo
	}

	db := config.GetDatabaseInstance()
	coll := db.Collection("catalogos")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	opts := options.Find().SetSort(bson.D{{Key: "orden", Value: 1}})
	cursor, err := coll.Find(ctx, filter, opts)
	if err != nil {
		views.RenderError(w, http.StatusInternalServerError, "Error consultando catálogos", err.Error())
		return
	}
	defer cursor.Close(ctx)

	var list []models.Catalogo
	_ = cursor.All(ctx, &list)

	views.RenderSuccess(w, http.StatusOK, "Catálogos maestros", list)
}

