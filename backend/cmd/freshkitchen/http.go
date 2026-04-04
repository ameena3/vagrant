package main

import (
	"context"
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
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/rs/cors"
	goahttp "goa.design/goa/v3/http"
)

// handleHTTPServer starts configures and starts a HTTP server on the given
// port. It shuts down the server if any error is received in the error channel.
func handleHTTPServer(ctx context.Context, port string, frontendURL string, scheduleEndpoints *schedule.Endpoints, announcementEndpoints *announcement.Endpoints, adminEndpoints *admin.Endpoints, analyticsEndpoints *analytics.Endpoints, orderEndpoints *order.Endpoints, menuEndpoints *menu.Endpoints, wg *sync.WaitGroup, errc chan error) {

	// Provide the transport specific request decoder and response encoder.
	// The goa http package has built-in support for JSON, XML and gob.
	// Other encodings can be used by providing the corresponding functions,
	// see goa.design/implement/encoding.
	var (
		dec = goahttp.RequestDecoder
		enc = goahttp.ResponseEncoder
	)

	// Build the service HTTP request multiplexer
	var mux goahttp.Muxer
	{
		mux = goahttp.NewMuxer()
	}

	// Wrap the endpoints with the transport specific layers. The generated
	// server packages contains code generated from the design which maps
	// the service input and output data structures to HTTP requests and
	// responses.
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

	// Add health check endpoint
	mux.Handle("GET", "/health", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))

	// Add static file server for uploads
	fs := http.FileServer(http.Dir("/app/uploads"))
	mux.Handle("GET", "/uploads/*", http.StripPrefix("/uploads/", fs))

	var handler http.Handler = mux

	// Add CORS middleware
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

	// Start HTTP server using default configuration, change the code to
	// configure the server as required by your service.
	addr := net.JoinHostPort("0.0.0.0", port)
	srv := &http.Server{Addr: addr, Handler: handler, ReadHeaderTimeout: time.Second * 60}

	(*wg).Add(1)
	go func() {
		defer (*wg).Done()

		// Start HTTP server in a separate goroutine.
		go func() {
			log.Printf("HTTP server listening on %q", addr)
			errc <- srv.ListenAndServe()
		}()

		<-ctx.Done()
		log.Printf("shutting down HTTP server at %q", addr)

		// Shutdown gracefully with a 30s timeout.
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		err := srv.Shutdown(ctx)
		if err != nil {
			log.Printf("failed to shutdown: %v", err)
		}
	}()
}

// errorHandler returns a function that writes and logs the given error.
// The function also writes and logs the error unique ID so that it's possible
// to correlate.
func errorHandler(logCtx context.Context) func(context.Context, http.ResponseWriter, error) {
	return func(ctx context.Context, w http.ResponseWriter, err error) {
		log.Printf("ERROR: %s", err.Error())
	}
}
