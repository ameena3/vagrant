package main

import (
	"context"
	"fmt"
	freshkitchen "freshkitchen"
	"freshkitchen/store"
	admin "freshkitchen/gen/admin"
	analytics "freshkitchen/gen/analytics"
	announcement "freshkitchen/gen/announcement"
	menu "freshkitchen/gen/menu"
	order "freshkitchen/gen/order"
	schedule "freshkitchen/gen/schedule"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
)

func main() {
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

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	adminName := os.Getenv("ADMIN_NAME")
	if adminName == "" {
		adminName = "Admin"
	}

	ctx := context.Background()

	// Initialize MongoDB store
	s, err := store.New(mongoURI)
	if err != nil {
		log.Fatalf("failed to initialize store: %v", err)
	}
	defer s.Close(context.Background())

	log.Printf("Connected to MongoDB at %s", mongoURI)

	// Seed initial admin user if DB is empty
	if err := s.User.EnsureAdminExists(ctx, adminEmail, adminName, adminPassword); err != nil {
		log.Printf("Warning: failed to seed admin user: %v", err)
	}

	// Initialize services
	var (
		scheduleSvc     schedule.Service
		announcementSvc announcement.Service
		adminSvc        admin.Service
		analyticsSvc    analytics.Service
		orderSvc        order.Service
		menuSvc         menu.Service
	)
	{
		scheduleSvc = freshkitchen.NewSchedule(s)
		announcementSvc = freshkitchen.NewAnnouncement(s)
		adminSvc = freshkitchen.NewAdmin(s)
		analyticsSvc = freshkitchen.NewAnalytics(s)
		orderSvc = freshkitchen.NewOrder(s)
		menuSvc = freshkitchen.NewMenu(s)
	}

	var (
		scheduleEndpoints     *schedule.Endpoints
		announcementEndpoints *announcement.Endpoints
		adminEndpoints        *admin.Endpoints
		analyticsEndpoints    *analytics.Endpoints
		orderEndpoints        *order.Endpoints
		menuEndpoints         *menu.Endpoints
	)
	{
		scheduleEndpoints = schedule.NewEndpoints(scheduleSvc)
		announcementEndpoints = announcement.NewEndpoints(announcementSvc)
		adminEndpoints = admin.NewEndpoints(adminSvc)
		analyticsEndpoints = analytics.NewEndpoints(analyticsSvc)
		orderEndpoints = order.NewEndpoints(orderSvc)
		menuEndpoints = menu.NewEndpoints(menuSvc)
	}

	errc := make(chan error)

	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		errc <- fmt.Errorf("%s", <-c)
	}()

	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(ctx)

	handleHTTPServer(ctx, port, frontendURL, scheduleEndpoints, announcementEndpoints, adminEndpoints, analyticsEndpoints, orderEndpoints, menuEndpoints, s, jwtSecret, &wg, errc)

	log.Printf("exiting (%v)", <-errc)
	cancel()
	wg.Wait()
	log.Printf("exited")
}
