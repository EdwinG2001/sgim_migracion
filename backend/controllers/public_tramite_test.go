package controllers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"sgim_migracion/config"
	"sgim_migracion/controllers"
	"sgim_migracion/middlewares"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestRegisterCitizenClean(t *testing.T) {
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		t.Fatalf("Error conectando a BD: %v", err)
	}

	authCtrl := controllers.NewAuthController()

	docNum := "PAS-" + primitive.NewObjectID().Hex()[:8]
	email := "ciudadano." + docNum + "@gmail.com"

	ctx := context.Background()
	_, _ = db.Collection("personas").DeleteOne(ctx, bson.M{"numero_documento": docNum})
	_, _ = db.Collection("usuarios").DeleteOne(ctx, bson.M{"username": email})

	// Registro limpio: SOLO IDENTIDAD Y CUENTA (SIN TRÁMITES)
	payload := map[string]interface{}{
		"tipo_documento":   "pasaporte",
		"numero_documento": docNum,
		"nombres":         "Josimar Feliz",
		"apellidos":       "Canabria Gomez",
		"fecha_nacimiento": "1990-03-15",
		"nacionalidad":    "PER",
		"sexo":            "M",
		"email":           email,
		"password":        "Josimar123*",
		"telefono":        "0987654321",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register-citizen", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	authCtrl.RegisterCitizen(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Código esperado 201, recibido %d. Body: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &res)
	t.Logf("[SUCCESS] Ciudadano registrado limpiamente en personas, usuarios, correos y telefonos: %v", res["message"])

	// Verificar token JWT devuelto
	data := res["data"].(map[string]interface{})
	token := data["token"].(string)
	if token == "" {
		t.Fatalf("Token JWT vacío")
	}

	// 2. Probar envío de trámite por separado con Tablas Satélite (direcciones y nucleo_familiar)
	publicCtrl := controllers.NewPublicTramiteController()
	userMap := data["user"].(map[string]interface{})
	userIDStr := userMap["id"].(string)

	claims := &middlewares.Claims{
		UserID:   userIDStr,
		Username: email,
		Rol:      "solo_lectura",
	}
	reqTramite := httptest.NewRequest(http.MethodPost, "/api/tramites/solicitar", bytes.NewBuffer([]byte(`{
		"tipo_tramite": "refugio",
		"motivo_salida": "Persecución política y crisis de seguridad en región de origen.",
		"fecha_ingreso": "2026-02-10",
		"provincia": "Pichincha",
		"canton": "Quito",
		"parroquia": "Iñaquito",
		"calle_principal": "Av. Amazonas y Naciones Unidas",
		"familiar_nombres": "Maria Elena",
		"familiar_apellidos": "Canabria",
		"familiar_parentesco": "hija"
	}`)))
	reqTramite = reqTramite.WithContext(context.WithValue(reqTramite.Context(), middlewares.UserContextKey, claims))

	wTramite := httptest.NewRecorder()
	publicCtrl.SolicitarTramite(wTramite, reqTramite)

	if wTramite.Code != http.StatusCreated {
		t.Fatalf("Error al solicitar trámite posterior: %d body: %s", wTramite.Code, wTramite.Body.String())
	}

	t.Logf("[SUCCESS] Trámite posterior con dirección y núcleo familiar registrado con éxito: %s", wTramite.Body.String())
}
