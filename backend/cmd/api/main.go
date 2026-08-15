package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/pubsub"
	firebase "firebase.google.com/go/v4"
)

type API struct {
	app         *firebase.App
	pubsubClient *pubsub.Client
}

func main() {
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "spresso-dev" // fallback for local dev
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	pubsubClient, err := pubsub.NewClient(ctx, projectID)
	if err != nil {
		log.Fatalf("error initializing pubsub client: %v\n", err)
	}

	api := &API{
		app:         app,
		pubsubClient: pubsubClient,
	}

	mux := http.NewServeMux()
	
	// API Endpoints
	mux.HandleFunc("GET /api/v1/inventory", api.handleGetInventory)
	mux.HandleFunc("POST /api/v1/try-on", api.handleRequestVirtualTryOn)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting API server on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func (a *API) handleGetInventory(w http.ResponseWriter, r *http.Request) {
	// Stub: In reality, use aggressive connection pooling to fetch from Cloud SQL
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Inventory fetched"})
}

func (a *API) handleRequestVirtualTryOn(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	
	// App-Level Pub/Sub: Publish event for async processing
	topic := a.pubsubClient.Topic("virtual-tryon-requests")
	result := topic.Publish(ctx, &pubsub.Message{
		Data: []byte(`{"userId": "123", "action": "start_tryon"}`),
	})
	
	go func() {
		if _, err := result.Get(ctx); err != nil {
			log.Printf("Failed to publish message: %v", err)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "processing"})
}
