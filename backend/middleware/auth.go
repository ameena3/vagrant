package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserEmailKey contextKey = "user_email"
	UserNameKey  contextKey = "user_name"
	UserRoleKey  contextKey = "user_role"
	UserIDKey    contextKey = "user_id"
)

// Claims defines the JWT payload.
type Claims struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// AuthMiddleware verifies a signed JWT and populates user info into the request context.
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenStr == authHeader {
				http.Error(w, "Bearer token required", http.StatusUnauthorized)
				return
			}

			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserEmailKey, claims.Email)
			ctx = context.WithValue(ctx, UserNameKey, claims.Name)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
			ctx = context.WithValue(ctx, UserIDKey, claims.Subject)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserEmail(ctx context.Context) string {
	v, _ := ctx.Value(UserEmailKey).(string)
	return v
}

func GetUserName(ctx context.Context) string {
	v, _ := ctx.Value(UserNameKey).(string)
	return v
}

func GetUserRole(ctx context.Context) string {
	v, _ := ctx.Value(UserRoleKey).(string)
	return v
}

func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}
