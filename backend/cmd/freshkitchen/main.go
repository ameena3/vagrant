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
	// Get configuration from environment variables
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

	ctx := context.Background()

	// Initialize MongoDB store
	s, err := store.New(mongoURI)
	if err != nil {
		log.Fatalf("failed to initialize store: %v", err)
	}
	defer s.Close(context.Background())

	log.Printf("Connected to MongoDB at %s", mongoURI)

	// Initialize the services with the store
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

	// Wrap the services in endpoints that can be invoked from other services
	// potentially running in different processes.
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

	// Create channel used by both the signal handler and server goroutines
	// to notify the main goroutine when to stop the server.
	errc := make(chan error)

	// Setup interrupt handler. This optional step configures the process so
	// that SIGINT and SIGTERM signals cause the services to stop gracefully.
	go func() {
		c := make(chan os.Signal, 1)
		signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
		errc <- fmt.Errorf("%s", <-c)
	}()

	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(ctx)

	// Start the HTTP server
	handleHTTPServer(ctx, port, frontendURL, scheduleEndpoints, announcementEndpoints, adminEndpoints, analyticsEndpoints, orderEndpoints, menuEndpoints, s.User, &wg, errc)

	// Wait for signal.
	log.Printf("exiting (%v)", <-errc)

	// Send cancellation signal to the goroutines.
	cancel()

	wg.Wait()
	log.Printf("exited")
}
