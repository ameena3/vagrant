package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"freshkitchen/middleware"
	"freshkitchen/services"
	"freshkitchen/store"
	"github.com/rs/cors"
)

func main() {
	// Get config from environment
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017/freshkitchen"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// Initialize store
	s, err := store.New(mongoURI)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer s.Close(context.Background())

	// Initialize services
	menuSvc := services.NewMenuService(s)
	orderSvc := services.NewOrderService(s)
	scheduleSvc := services.NewScheduleService(s)
	adminSvc := services.NewAdminService(s)
	announcementSvc := services.NewAnnouncementService(s)
	analyticsSvc := services.NewAnalyticsService(s)

	// Auth middlewares
	authMw := middleware.AuthMiddleware(s.User)
	optionalAuthMw := middleware.OptionalAuthMiddleware(s.User)

	// Create router
	mux := http.NewServeMux()

	// === PUBLIC ROUTES ===

	// GET /api/menus/week/{weekStart}
	mux.Handle("GET /api/menus/week/{weekStart}", optionalAuthMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		weekStart := r.PathValue("weekStart")
		menus, err := menuSvc.GetWeekMenus(r.Context(), weekStart)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, menus)
	})))

	// GET /api/schedule/week/{weekStart}
	mux.Handle("GET /api/schedule/week/{weekStart}", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		weekStart := r.PathValue("weekStart")
		days, weekendsEnabled, err := scheduleSvc.GetWeekSchedule(r.Context(), weekStart)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, map[string]any{
			"days":             days,
			"weekends_enabled": weekendsEnabled,
		})
	}))

	// GET /api/announcements
	mux.Handle("GET /api/announcements", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		anns, err := announcementSvc.ListActive(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, anns)
	}))

	// === AUTHENTICATED CUSTOMER ROUTES ===

	// POST /api/orders
	mux.Handle("POST /api/orders", authMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var order store.Order
		if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		order.CustomerEmail = middleware.GetUserEmail(r.Context())
		order.CustomerName = middleware.GetUserName(r.Context())
		order.CustomerID = middleware.GetUserID(r.Context())

		result, err := orderSvc.CreateOrder(r.Context(), &order)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		jsonResponse(w, result)
	})))

	// GET /api/orders/{id}
	mux.Handle("GET /api/orders/{id}", authMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		order, err := orderSvc.GetOrder(r.Context(), id)
		if err != nil {
			httpError(w, err, http.StatusNotFound)
			return
		}
		// Check if user owns the order or is admin
		email := middleware.GetUserEmail(r.Context())
		role := middleware.GetUserRole(r.Context())
		if order.CustomerEmail != email && role != "admin" {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		jsonResponse(w, order)
	})))

	// POST /api/orders/checkout
	mux.Handle("POST /api/orders/checkout", authMw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			OrderID string `json:"order_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		url, sessionID, err := orderSvc.Checkout(r.Context(), body.OrderID)
		if err != nil {
			// If stripe disabled, return the order directly
			if strings.Contains(err.Error(), "stripe is disabled") {
				order, _ := orderSvc.GetOrder(r.Context(), body.OrderID)
				jsonResponse(w, map[string]any{"order": order, "stripe_disabled": true})
				return
			}
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, map[string]any{
			"checkout_url": url,
			"session_id":   sessionID,
			"order_id":     body.OrderID,
		})
	})))

	// POST /api/webhooks/stripe
	mux.Handle("POST /api/webhooks/stripe", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		// In production, verify webhook signature
		var event struct {
			Type string `json:"type"`
			Data struct {
				Object struct {
					ID string `json:"id"`
				} `json:"object"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &event); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		if event.Type == "checkout.session.completed" {
			orderSvc.HandleStripeWebhook(r.Context(), event.Data.Object.ID)
		}
		w.WriteHeader(http.StatusOK)
	}))

	// === ADMIN ROUTES ===
	adminRouter := http.NewServeMux()

	// Menu management
	adminRouter.HandleFunc("POST /api/admin/menus", func(w http.ResponseWriter, r *http.Request) {
		var menu store.Menu
		if err := json.NewDecoder(r.Body).Decode(&menu); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		menu.CreatedBy = middleware.GetUserID(r.Context())
		result, err := menuSvc.CreateMenu(r.Context(), &menu)
		if err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusCreated)
		jsonResponse(w, result)
	})

	adminRouter.HandleFunc("DELETE /api/admin/menus/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if err := menuSvc.DeleteMenu(r.Context(), id); err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	adminRouter.HandleFunc("POST /api/admin/menus/upload", func(w http.ResponseWriter, r *http.Request) {
		r.ParseMultipartForm(10 << 20) // 10MB
		file, header, err := r.FormFile("image")
		if err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		defer file.Close()

		path, err := menuSvc.UploadImage(r.Context(), header.Filename, file)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, map[string]string{"image_path": path})
	})

	// Orders management
	adminRouter.HandleFunc("GET /api/admin/orders", func(w http.ResponseWriter, r *http.Request) {
		week := r.URL.Query().Get("week")
		orders, err := orderSvc.ListOrders(r.Context(), week)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, orders)
	})

	// Schedule management
	adminRouter.HandleFunc("PUT /api/admin/schedule/day", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Date        string `json:"date"`
			Blocked     bool   `json:"blocked"`
			BlockReason string `json:"block_reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		day, err := scheduleSvc.UpdateDay(r.Context(), body.Date, body.Blocked, body.BlockReason, middleware.GetUserID(r.Context()))
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, day)
	})

	adminRouter.HandleFunc("PUT /api/admin/schedule/week", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			WeekStart   string `json:"week_start"`
			Blocked     bool   `json:"blocked"`
			BlockReason string `json:"block_reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		days, err := scheduleSvc.UpdateWeek(r.Context(), body.WeekStart, body.Blocked, body.BlockReason, middleware.GetUserID(r.Context()))
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, days)
	})

	adminRouter.HandleFunc("PUT /api/admin/schedule/weekends", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Enabled bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		if err := scheduleSvc.ToggleWeekends(r.Context(), body.Enabled); err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, map[string]bool{"enabled": body.Enabled})
	})

	// Admin user management
	adminRouter.HandleFunc("GET /api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		admins, err := adminSvc.ListAdmins(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, admins)
	})

	adminRouter.HandleFunc("POST /api/admin/users", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		user, err := adminSvc.AddAdmin(r.Context(), body.Email)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, user)
	})

	adminRouter.HandleFunc("DELETE /api/admin/users/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if err := adminSvc.RemoveAdmin(r.Context(), id); err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	adminRouter.HandleFunc("GET /api/admin/settings", func(w http.ResponseWriter, r *http.Request) {
		weekendsEnabled, stripeEnabled, err := adminSvc.GetSettings(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, map[string]bool{
			"weekends_enabled": weekendsEnabled,
			"stripe_enabled":   stripeEnabled,
		})
	})

	// Announcements management
	adminRouter.HandleFunc("GET /api/admin/announcements", func(w http.ResponseWriter, r *http.Request) {
		anns, err := announcementSvc.GetAll(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, anns)
	})

	adminRouter.HandleFunc("POST /api/admin/announcements", func(w http.ResponseWriter, r *http.Request) {
		var ann store.Announcement
		if err := json.NewDecoder(r.Body).Decode(&ann); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		ann.CreatedBy = middleware.GetUserID(r.Context())
		result, err := announcementSvc.Create(r.Context(), &ann)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		jsonResponse(w, result)
	})

	adminRouter.HandleFunc("PUT /api/admin/announcements/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		var ann store.Announcement
		if err := json.NewDecoder(r.Body).Decode(&ann); err != nil {
			httpError(w, err, http.StatusBadRequest)
			return
		}
		result, err := announcementSvc.Update(r.Context(), id, &ann)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, result)
	})

	adminRouter.HandleFunc("DELETE /api/admin/announcements/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		if err := announcementSvc.Delete(r.Context(), id); err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})

	// Analytics
	adminRouter.HandleFunc("GET /api/admin/analytics/summary", func(w http.ResponseWriter, r *http.Request) {
		summary, err := analyticsSvc.Summary(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, summary)
	})

	adminRouter.HandleFunc("GET /api/admin/analytics/orders", func(w http.ResponseWriter, r *http.Request) {
		from := r.URL.Query().Get("from")
		to := r.URL.Query().Get("to")
		trends, err := analyticsSvc.OrderTrends(r.Context(), from, to)
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, trends)
	})

	adminRouter.HandleFunc("GET /api/admin/analytics/popular-items", func(w http.ResponseWriter, r *http.Request) {
		items, err := analyticsSvc.PopularItems(r.Context())
		if err != nil {
			httpError(w, err, http.StatusInternalServerError)
			return
		}
		jsonResponse(w, items)
	})

	// Mount admin routes with auth + admin middleware
	mux.Handle("/api/admin/", authMw(middleware.AdminMiddleware(adminRouter)))

	// Serve uploaded images
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("/app/uploads"))))

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, map[string]string{"status": "ok"})
	})

	// CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{frontendURL, "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	})

	handler := c.Handler(mux)

	// Start server
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: handler,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh
		log.Println("Shutting down server...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(ctx)
	}()

	log.Printf("Fresh Kitchen API server starting on :%s", port)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

func jsonResponse(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func httpError(w http.ResponseWriter, err error, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
}
