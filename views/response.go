package views

import (
	"encoding/json"
	"net/http"
	"reflect"
)

// Response es la vista estándar para respuestas exitosas en JSON.
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Meta    *Pagination `json:"meta,omitempty"`
}

// ErrorResponse es la vista estándar para errores de la API.
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

// Pagination contiene metadatos de paginación para consultas de listados masivos.
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// RenderJSON serializa cualquier estructura y la escribe en el ResponseWriter con el status HTTP adecuado.
func RenderJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(data)
}

// RenderSuccess envía una respuesta 200/201 con formato unificado.
func RenderSuccess(w http.ResponseWriter, statusCode int, message string, data interface{}) {
	RenderJSON(w, statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// RenderPaginated envía una respuesta de lista con metadatos de paginación.
func RenderPaginated(w http.ResponseWriter, message string, data interface{}, page, limit int, total int64) {
	if data == nil {
		data = []interface{}{}
	} else {
		val := reflect.ValueOf(data)
		if val.Kind() == reflect.Slice && val.IsNil() {
			data = []interface{}{}
		}
	}

	totalPages := int(total) / limit
	if limit > 0 && int(total)%limit > 0 {
		totalPages++
	}

	RenderJSON(w, http.StatusOK, Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta: &Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// RenderError envía una respuesta de error estandarizada.
func RenderError(w http.ResponseWriter, statusCode int, errMsg string, details ...string) {
	det := ""
	if len(details) > 0 {
		det = details[0]
	}
	RenderJSON(w, statusCode, ErrorResponse{
		Success: false,
		Error:   errMsg,
		Details: det,
	})
}

