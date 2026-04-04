package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"freshkitchen/store"
)

type contextKey string

const (
	UserEmailKey contextKey = "user_email"
	UserNameKey  contextKey = "user_name"
	UserRoleKey  contextKey = "user_role"
	UserIDKey    contextKey = "user_id"
)

// AuthMiddleware verifies Google OAuth tokens and creates/finds users
// It reads the Authorization header, validates the token with Google,
// and sets user info in the request context
func AuthMiddleware(userStore *store.UserStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				http.Error(w, "Bearer token required", http.StatusUnauthorized)
				return
			}

			// Verify token with Google's tokeninfo endpoint
			// For ID tokens from NextAuth, we verify with Google
			resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + token)
			if err != nil {
				http.Error(w, "Failed to verify token", http.StatusUnauthorized)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != 200 {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			var tokenInfo struct {
				Email   string `json:"email"`
				Name    string `json:"name"`
				Picture string `json:"picture"`
				Sub     string `json:"sub"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&tokenInfo); err != nil {
				http.Error(w, "Failed to decode token info", http.StatusUnauthorized)
				return
			}

			if tokenInfo.Email == "" {
				http.Error(w, "Token does not contain email", http.StatusUnauthorized)
				return
			}

			// Find or create user (first user becomes admin)
			user, err := userStore.FindOrCreate(r.Context(), tokenInfo.Email, tokenInfo.Name, tokenInfo.Picture)
			if err != nil {
				http.Error(w, "Failed to process user", http.StatusInternalServerError)
				return
			}

			// Set user info in context
			ctx := context.WithValue(r.Context(), UserEmailKey, user.Email)
			ctx = context.WithValue(ctx, UserNameKey, user.Name)
			ctx = context.WithValue(ctx, UserRoleKey, user.Role)
			ctx = context.WithValue(ctx, UserIDKey, user.ID.Hex())

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuthMiddleware tries to authenticate but doesn't require it
func OptionalAuthMiddleware(userStore *store.UserStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}
			// If token is present, try to authenticate (but don't fail if invalid)
			token := strings.TrimPrefix(authHeader, "Bearer ")
			resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + token)
			if err == nil && resp.StatusCode == 200 {
				defer resp.Body.Close()
				var tokenInfo struct {
					Email   string `json:"email"`
					Name    string `json:"name"`
					Picture string `json:"picture"`
				}
				if json.NewDecoder(resp.Body).Decode(&tokenInfo) == nil && tokenInfo.Email != "" {
					user, err := userStore.FindOrCreate(r.Context(), tokenInfo.Email, tokenInfo.Name, tokenInfo.Picture)
					if err == nil {
						ctx := context.WithValue(r.Context(), UserEmailKey, user.Email)
						ctx = context.WithValue(ctx, UserNameKey, user.Name)
						ctx = context.WithValue(ctx, UserRoleKey, user.Role)
						ctx = context.WithValue(ctx, UserIDKey, user.ID.Hex())
						r = r.WithContext(ctx)
					}
				}
			}
			next.ServeHTTP(w, r)
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
