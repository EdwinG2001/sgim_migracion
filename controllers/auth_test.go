package controllers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"sgim_migracion/config"
	"sgim_migracion/controllers"
)

func TestLoginNewTeamMembers(t *testing.T) {
	db := config.GetDatabaseInstance()
	if err := db.Connect(); err != nil {
		t.Fatalf("Error conectando a BD: %v", err)
	}

	authCtrl := controllers.NewAuthController()

	credentials := []struct {
		Username string
		Password string
		Rol      string
	}{
		{"admin", "Admin2026*", "admin"},
		{"intriagoofimi@gmail.com", "in12345", "oficial_migracion"},
		{"corozoanalis@gmail.com", "co12345", "analista_pi"},
		{"caisavisas@gmail.com", "ca12345", "analista_visas"},
		{"caicedoregu@gmail.com", "les12345", "analista_regularizacion"},
	}

	for _, cred := range credentials {
		body, _ := json.Marshal(map[string]string{
			"username": cred.Username,
			"password": cred.Password,
		})

		req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(body))
		w := httptest.NewRecorder()

		authCtrl.Login(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Fallo en login de %s. Código esperado 200, recibido %d. Body: %s", cred.Username, w.Code, w.Body.String())
		} else {
			t.Logf("[SUCCESS] Login exitoso para %s (Rol: %s)", cred.Username, cred.Rol)
		}
	}
}

