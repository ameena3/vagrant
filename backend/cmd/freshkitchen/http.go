package main

import (
	"context"
	"encoding/json"
	admin "freshkitchen/gen/admin"
	analytics "freshkitchen/gen/analytics"
	announcement "freshkitchen/gen/announcement"
	adminsvr "freshkitchen/gen/http/admin/server"
	analyticssvr "freshkitchen/gen/http/analytics/server"
	announcementsvr "freshkitchen/gen/http/announcement/server"
	menusvr "freshkitchen/gen/http/menu/server"
	ordersvr "freshkitchen/gen/http/order/server"
	schedulesvr "freshkitchen/gen/http/schedule/server"
	menu "freshkitchen/gen/menu"
	order "freshkitchen/gen/order"
	schedule "freshkitchen/gen/schedule"
	mw "freshkitchen/middleware"
	"freshkitchen/store"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors"
	goahttp "goa.design/goa/v3/http"
)

// handleHTTPServer starts configures and starts a HTTP server on the given
// port. It shuts down the server if any error is received in the error channel.
func handleHTTPServer(ctx context.Context, port string, frontendURL string, scheduleEndpoints *schedule.Endpoints, announcementEndpoints *announcement.Endpoints, adminEndpoints *admin.Endpoints, analyticsEndpoints *analytics.Endpoints, orderEndpoints *order.Endpoints, menuEndpoints *menu.Endpoints, userStore *store.UserStore, jwtSecret string, wg *sync.WaitGroup, errc chan error) {

	// Provide the transport specific request decoder and response encoder.
	var (
		dec = goahttp.RequestDecoder
		enc = goahttp.ResponseEncoder
	)

	// Build the service HTTP request multiplexer
	var mux goahttp.Muxer
	{
		mux = goahttp.NewMuxer()
	}

	// Wrap the endpoints with the transport specific layers.
	var (
		scheduleServer     *schedulesvr.Server
		announcementServer *announcementsvr.Server
		adminServer        *adminsvr.Server
		analyticsServer    *analyticssvr.Server
		orderServer        *ordersvr.Server
		menuServer         *menusvr.Server
	)
	{
		eh := errorHandler(ctx)
		scheduleServer = schedulesvr.New(scheduleEndpoints, mux, dec, enc, eh, nil)
		announcementServer = announcementsvr.New(announcementEndpoints, mux, dec, enc, eh, nil)
		adminServer = adminsvr.New(adminEndpoints, mux, dec, enc, eh, nil)
		analyticsServer = analyticssvr.New(analyticsEndpoints, mux, dec, enc, eh, nil)
		orderServer = ordersvr.New(orderEndpoints, mux, dec, enc, eh, nil)
		menuServer = menusvr.New(menuEndpoints, mux, dec, enc, eh, nil)
	}

	// Configure the mux.
	schedulesvr.Mount(mux, scheduleServer)
	announcementsvr.Mount(mux, announcementServer)
	adminsvr.Mount(mux, adminServer)
	analyticssvr.Mount(mux, analyticsServer)
	ordersvr.Mount(mux, orderServer)
	menusvr.Mount(mux, menuServer)

	// Health check
	mux.Handle("GET", "/health", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))

	// POST /api/auth/login — issue JWT on valid credentials
	mux.Handle("POST", "/api/auth/login", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		user, err := userStore.FindByCredentials(r.Context(), req.Email, req.Password)
		if err != nil {
			http.Error(w, "Invalid email or password", http.StatusUnauthorized)
			return
		}

		claims := &mw.Claims{
			Email: user.Email,
			Name:  user.Name,
			Role:  user.Role,
			RegisteredClaims: jwt.RegisteredClaims{
				Subject:   user.ID.Hex(),
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
				IssuedAt:  jwt.NewNumericDate(time.Now()),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenStr, err := token.SignedString([]byte(jwtSecret))
		if err != nil {
			http.Error(w, "Failed to generate token", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"token": tokenStr,
			"user": map[string]string{
				"id":    user.ID.Hex(),
				"email": user.Email,
				"name":  user.Name,
				"role":  user.Role,
			},
		})
	}))

	// GET /api/users/me — return current user profile (requires auth)
	profileHandler := mw.AuthMiddleware(jwtSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"id":    mw.GetUserID(r.Context()),
			"email": mw.GetUserEmail(r.Context()),
			"name":  mw.GetUserName(r.Context()),
			"role":  mw.GetUserRole(r.Context()),
		})
	}))
	mux.Handle("GET", "/api/users/me", http.HandlerFunc(profileHandler.ServeHTTP))

	// POST /api/admin/users/create — create a user (requires admin)
	createUserHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Email    string `json:"email"`
			Name     string `json:"name"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))
		if req.Role != "admin" && req.Role != "customer" {
			req.Role = "customer"
		}

		user, err := userStore.CreateWithPassword(r.Context(), req.Email, req.Name, req.Password, req.Role)
		if err != nil {
			http.Error(w, "Failed to create user: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		})
	})))
	mux.Handle("POST", "/api/admin/users/create", http.HandlerFunc(createUserHandler.ServeHTTP))

	// Static file server for uploads
	fs := http.FileServer(http.Dir("/app/uploads"))
	mux.Handle("GET", "/uploads/*", http.HandlerFunc(http.StripPrefix("/uploads/", fs).ServeHTTP))

	// Wrap all /api/admin/* Goa routes with JWT validation + admin role check.
	// Custom handlers (e.g., /api/admin/users/create) already have their own middleware
	// but double-wrapping is harmless since AuthMiddleware short-circuits on valid tokens.
	var handler http.Handler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/admin/") {
			mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(mux)).ServeHTTP(w, r)
			return
		}
		mux.ServeHTTP(w, r)
	})

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{frontendURL, "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})
	handler = c.Handler(handler)

	// Log mounted endpoints
	for _, m := range scheduleServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}
	for _, m := range announcementServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}
	for _, m := range adminServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}
	for _, m := range analyticsServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}
	for _, m := range orderServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}
	for _, m := range menuServer.Mounts {
		log.Printf("HTTP %q mounted on %s %s", m.Method, m.Verb, m.Pattern)
	}

	addr := net.JoinHostPort("0.0.0.0", port)
	srv := &http.Server{Addr: addr, Handler: handler, ReadHeaderTimeout: time.Second * 60}

	(*wg).Add(1)
	go func() {
		defer (*wg).Done()

		go func() {
			log.Printf("HTTP server listening on %q", addr)
			errc <- srv.ListenAndServe()
		}()

		<-ctx.Done()
		log.Printf("shutting down HTTP server at %q", addr)

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("failed to shutdown: %v", err)
		}
	}()
}

// errorHandler returns a function that writes and logs the given error.
func errorHandler(logCtx context.Context) func(context.Context, http.ResponseWriter, error) {
	return func(ctx context.Context, w http.ResponseWriter, err error) {
		log.Printf("ERROR: %s", err.Error())
	}
}
