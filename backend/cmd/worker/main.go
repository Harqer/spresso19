package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/pubsub"
	firebase "firebase.google.com/go/v4"
)

type Worker struct {
	app *firebase.App
}

// PubSubMessage is the payload of a Pub/Sub event.
type PubSubMessage struct {
	Message struct {
		Data []byte `json:"data,omitempty"`
		ID   string `json:"messageId"`
	} `json:"message"`
	Subscription string `json:"subscription"`
}

func main() {
	ctx := context.Background()
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "spresso-dev"
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{ProjectID: projectID})
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	worker := &Worker{
		app: app,
	}

	mux := http.NewServeMux()
	
	// Pub/Sub Push Endpoint
	mux.HandleFunc("POST /pubsub/push", worker.handlePubSubPush)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Starting Worker server on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

func (w *Worker) handlePubSubPush(wResp http.ResponseWriter, r *http.Request) {
	var m PubSubMessage
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(wResp, "Bad Request", http.StatusBadRequest)
		return
	}
	if err := json.Unmarshal(body, &m); err != nil {
		http.Error(wResp, "Bad Request", http.StatusBadRequest)
		return
	}

	log.Printf("Received message ID: %s, Data: %s", m.Message.ID, string(m.Message.Data))

	// Stub: Execute AI generation or background heavy task here

	wResp.WriteHeader(http.StatusOK)
}
