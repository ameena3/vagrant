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
	"go.mongodb.org/mongo-driver/v2/bson"
	mongoopts "go.mongodb.org/mongo-driver/v2/mongo/options"
	goahttp "goa.design/goa/v3/http"
)

// handleHTTPServer starts configures and starts a HTTP server on the given
// port. It shuts down the server if any error is received in the error channel.
func handleHTTPServer(ctx context.Context, port string, frontendURL string, scheduleEndpoints *schedule.Endpoints, announcementEndpoints *announcement.Endpoints, adminEndpoints *admin.Endpoints, analyticsEndpoints *analytics.Endpoints, orderEndpoints *order.Endpoints, menuEndpoints *menu.Endpoints, appStore *store.Store, jwtSecret string, wg *sync.WaitGroup, errc chan error) {

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

		user, err := appStore.User.FindByCredentials(r.Context(), req.Email, req.Password)
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

		user, err := appStore.User.CreateWithPassword(r.Context(), req.Email, req.Name, req.Password, req.Role)
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

	// PUT /api/admin/users/{id} — update user role (requires admin)
	updateUserRoleHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
		if id == "" {
			http.Error(w, "Missing user ID", http.StatusBadRequest)
			return
		}
		var req struct {
			Role string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if req.Role != "admin" && req.Role != "customer" {
			http.Error(w, "Invalid role", http.StatusBadRequest)
			return
		}
		user, err := appStore.User.SetRoleByID(r.Context(), id, req.Role)
		if err != nil {
			http.Error(w, "Failed to update user role: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"id":    user.ID.Hex(),
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		})
	})))
	mux.Handle("PUT", "/api/admin/users/{id}", http.HandlerFunc(updateUserRoleHandler.ServeHTTP))

	// GET /api/admin/announcements — list all announcements (requires admin)
	listAnnouncementsHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		announcements, err := appStore.Announcement.GetAll(r.Context())
		if err != nil {
			http.Error(w, "Failed to fetch announcements: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if announcements == nil {
			announcements = []store.Announcement{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(announcements)
	})))
	mux.Handle("GET", "/api/admin/announcements", http.HandlerFunc(listAnnouncementsHandler.ServeHTTP))

	// POST /api/admin/orders — admin manually create an order (requires admin)
	adminCreateOrderHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			CustomerName  string `json:"customer_name"`
			CustomerEmail string `json:"customer_email"`
			WeekStart     string `json:"week_start"`
			Status        string `json:"status"`
			Items         []struct {
				Date         string  `json:"date"`
				DayOfWeek    int     `json:"day_of_week"`
				MealType     string  `json:"meal_type"`
				MenuItemName string  `json:"menu_item_name"`
				Price        float64 `json:"price"`
				Comment      string  `json:"comment,omitempty"`
			} `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		if req.CustomerName == "" || req.CustomerEmail == "" || req.WeekStart == "" {
			http.Error(w, "customer_name, customer_email, and week_start are required", http.StatusBadRequest)
			return
		}
		validStatuses := map[string]bool{"pending": true, "paid": true, "cancelled": true, "refunded": true}
		if req.Status == "" {
			req.Status = "pending"
		}
		if !validStatuses[req.Status] {
			http.Error(w, "Invalid status", http.StatusBadRequest)
			return
		}

		items := make([]store.OrderItem, len(req.Items))
		totalAmount := 0.0
		for i, item := range req.Items {
			items[i] = store.OrderItem{
				Date:         item.Date,
				DayOfWeek:    item.DayOfWeek,
				MealType:     item.MealType,
				MenuItemName: item.MenuItemName,
				Price:        item.Price,
				Comment:      item.Comment,
			}
			totalAmount += item.Price
		}

		o := &store.Order{
			CustomerName:  req.CustomerName,
			CustomerEmail: strings.TrimSpace(strings.ToLower(req.CustomerEmail)),
			WeekStart:     req.WeekStart,
			Status:        req.Status,
			Items:         items,
			TotalAmount:   totalAmount,
		}

		created, err := appStore.Order.Create(r.Context(), o)
		if err != nil {
			http.Error(w, "Failed to create order: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":             created.ID.Hex(),
			"customer_name":  created.CustomerName,
			"customer_email": created.CustomerEmail,
			"week_start":     created.WeekStart,
			"status":         created.Status,
			"items":          created.Items,
			"total_amount":   created.TotalAmount,
			"created_at":     created.CreatedAt,
		})
	})))
	mux.Handle("POST", "/api/admin/orders", http.HandlerFunc(adminCreateOrderHandler.ServeHTTP))

	// PUT /api/admin/orders/{id} — full order update (requires admin)
	updateOrderHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
		// strip any trailing path segments (e.g., /status)
		id := strings.Split(path, "/")[0]
		if id == "" {
			http.Error(w, "Missing order ID", http.StatusBadRequest)
			return
		}

		var req struct {
			CustomerName  string `json:"customer_name"`
			CustomerEmail string `json:"customer_email"`
			WeekStart     string `json:"week_start"`
			Status        string `json:"status"`
			Items         []struct {
				Date         string  `json:"date"`
				DayOfWeek    int     `json:"day_of_week"`
				MealType     string  `json:"meal_type"`
				MenuItemName string  `json:"menu_item_name"`
				Price        float64 `json:"price"`
				Comment      string  `json:"comment,omitempty"`
			} `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		validStatuses := map[string]bool{"pending": true, "paid": true, "cancelled": true, "refunded": true}
		if req.Status != "" && !validStatuses[req.Status] {
			http.Error(w, "Invalid status", http.StatusBadRequest)
			return
		}

		items := make([]store.OrderItem, len(req.Items))
		totalAmount := 0.0
		for i, item := range req.Items {
			items[i] = store.OrderItem{
				Date:         item.Date,
				DayOfWeek:    item.DayOfWeek,
				MealType:     item.MealType,
				MenuItemName: item.MenuItemName,
				Price:        item.Price,
				Comment:      item.Comment,
			}
			totalAmount += item.Price
		}

		updated, err := appStore.Order.UpdateFull(r.Context(), id,
			req.CustomerName, strings.TrimSpace(strings.ToLower(req.CustomerEmail)),
			req.WeekStart, req.Status, items, totalAmount)
		if err != nil {
			http.Error(w, "Failed to update order: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":             updated.ID.Hex(),
			"customer_name":  updated.CustomerName,
			"customer_email": updated.CustomerEmail,
			"week_start":     updated.WeekStart,
			"status":         updated.Status,
			"items":          updated.Items,
			"total_amount":   updated.TotalAmount,
			"created_at":     updated.CreatedAt,
		})
	})))
	mux.Handle("PUT", "/api/admin/orders/{id}", http.HandlerFunc(updateOrderHandler.ServeHTTP))

	// DELETE /api/admin/orders/{id} — delete an order (requires admin)
	deleteOrderHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
		if id == "" {
			http.Error(w, "Missing order ID", http.StatusBadRequest)
			return
		}

		if err := appStore.Order.Delete(r.Context(), id); err != nil {
			http.Error(w, "Failed to delete order: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	mux.Handle("DELETE", "/api/admin/orders/{id}", http.HandlerFunc(deleteOrderHandler.ServeHTTP))

	// PUT /api/admin/orders/{id}/status — update order status (requires admin)
	updateOrderStatusHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/api/admin/orders/")
		id := strings.TrimSuffix(path, "/status")
		if id == "" {
			http.Error(w, "Missing order ID", http.StatusBadRequest)
			return
		}

		var req struct {
			Status string `json:"status"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		validStatuses := map[string]bool{"pending": true, "paid": true, "cancelled": true, "refunded": true}
		if !validStatuses[req.Status] {
			http.Error(w, "Invalid status", http.StatusBadRequest)
			return
		}

		if err := appStore.Order.UpdateStatus(r.Context(), id, req.Status); err != nil {
			http.Error(w, "Failed to update order: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"ok": true})
	})))
	mux.Handle("PUT", "/api/admin/orders/{id}/status", http.HandlerFunc(updateOrderStatusHandler.ServeHTTP))

	// GET /api/settings — public settings (weekends_enabled, hide_prices)
	mux.Handle("GET", "/api/settings", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		settingsColl := appStore.Settings()
		var doc map[string]interface{}
		settingsColl.FindOne(r.Context(), bson.M{}).Decode(&doc)
		hidePrices := false
		weekendsEnabled := false
		if doc != nil {
			if v, ok := doc["hide_prices"].(bool); ok {
				hidePrices = v
			}
			if v, ok := doc["weekends_enabled"].(bool); ok {
				weekendsEnabled = v
			}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{
			"hide_prices":      hidePrices,
			"weekends_enabled": weekendsEnabled,
		})
	}))

	// PUT /api/admin/settings/hide-prices — toggle hide prices (requires admin)
	hidePricesHandler := mw.AuthMiddleware(jwtSecret)(mw.AdminMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			HidePrices bool `json:"hide_prices"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}
		settingsColl := appStore.Settings()
		_, err := settingsColl.UpdateOne(
			r.Context(),
			bson.M{},
			bson.M{"$set": bson.M{"hide_prices": req.HidePrices}},
			mongoopts.UpdateOne().SetUpsert(true),
		)
		if err != nil {
			http.Error(w, "Failed to update setting: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]bool{"hide_prices": req.HidePrices})
	})))
	mux.Handle("PUT", "/api/admin/settings/hide-prices", http.HandlerFunc(hidePricesHandler.ServeHTTP))

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
		// Wrap customer order routes with auth so JWT claims land in context
		if strings.HasPrefix(r.URL.Path, "/api/orders") && r.URL.Path != "/api/webhooks/stripe" {
			mw.AuthMiddleware(jwtSecret)(mux).ServeHTTP(w, r)
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
