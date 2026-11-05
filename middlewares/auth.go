package middlewares

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"sgim_migracion/views"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type contextKey string

const (
	UserContextKey contextKey = "user_claims"
)

// Claims almacena el payload del token JWT
type Claims struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Rol      string `json:"rol"`
	jwt.RegisteredClaims
}

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "SGIM_SECRET_KEY_MIGRACION_ECUADOR_2026"
	}
	return []byte(secret)
}

// GenerateJWT genera un nuevo token con validez por defecto de 8 horas
func GenerateJWT(userID primitive.ObjectID, username, rol string) (string, error) {
	claims := Claims{
		UserID:   userID.Hex(),
		Username: username,
		Rol:      rol,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(8 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "SGIM-Ecuador",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateTokenString verifica la validez de un JWT y retorna sus claims
func ValidateTokenString(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de firma inesperado: %v", token.Header["alg"])
		}
		return getJWTSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("token inválido o expirado")
	}
	return claims, nil
}

// AuthMiddleware intercepta la petición y valida el Header Authorization: Bearer <token> o parámetro token
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenString := ""
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			tokenString = r.URL.Query().Get("token")
		}

		if tokenString == "" {
			views.RenderError(w, http.StatusUnauthorized, "Debe iniciar sesión para realizar esta acción")
			return
		}

		claims, err := ValidateTokenString(tokenString)
		if err != nil {
			views.RenderError(w, http.StatusUnauthorized, "Sesión inválida o expirada. Por favor inicie sesión nuevamente.")
			return
		}

		// Inyectar claims al contexto del request
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next(w, r.WithContext(ctx))
	}
}

// RequireRoles restringe el acceso solo a los roles especificados (RBAC)
func RequireRoles(allowedRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(*Claims)
			if !ok || claims == nil {
				views.RenderError(w, http.StatusUnauthorized, "Contexto de autenticación no encontrado")
				return
			}

			// Admin siempre tiene acceso total
			if claims.Rol == "admin" {
				next(w, r)
				return
			}

			hasRole := false
			for _, role := range allowedRoles {
				if claims.Rol == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				views.RenderError(w, http.StatusForbidden, fmt.Sprintf("Acceso denegado: rol '%s' no autorizado para este recurso", claims.Rol))
				return
			}

			next(w, r)
		}
	}
}

// GetUserFromContext extrae los claims del usuario autenticado desde el contexto HTTP
func GetUserFromContext(r *http.Request) (*Claims, error) {
	claims, ok := r.Context().Value(UserContextKey).(*Claims)
	if !ok || claims == nil {
		return nil, fmt.Errorf("usuario no autenticado en contexto")
	}
	return claims, nil
}

