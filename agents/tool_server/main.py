import os
from flask import Flask, request, jsonify
from google.cloud import secretmanager

app = Flask(__name__)

# Initialize Secret Manager client
secret_client = secretmanager.SecretManagerServiceClient()

def get_secret(secret_id: str) -> str:
    """Retrieve a secret from Google Cloud Secret Manager."""
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "get-spresso")
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    try:
        response = secret_client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        print(f"Failed to access secret {secret_id}: {e}")
        return ""

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route("/tools/apify/search", methods=["POST"])
def apify_search():
    """Product discovery search via Apify, using a secret key."""
    # Retrieve the API key securely at runtime
    apify_key = get_secret("APIFY_API_TOKEN")
    if not apify_key:
        return jsonify({"error": "Failed to retrieve API key"}), 500

    data = request.json
    query = data.get("query", "")
    if not query or not query.strip():
        return jsonify({"error": "Missing 'query' in request body."}), 400

    # Execute real Apify search. The token is sent via the Authorization header so it
    # never appears in the URL query string (which proxies and access logs record).
    import requests
    print(f"Executing Apify search for query of {len(query)} characters")

    apify_url = "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items"
    try:
        response = requests.post(
            apify_url,
            headers={"Authorization": f"Bearer {apify_key}"},
            json={"queries": query},
            timeout=30,
        )
        response.raise_for_status()
        results = response.json()
        if not results:
            return jsonify({"results": [], "message": "No results found for the query."}), 200
        return jsonify({"results": results}), 200
    except requests.exceptions.RequestException as e:
        print(f"Apify API error: {type(e).__name__}")
        return jsonify({"error": "Live product search is currently unavailable. Please try again."}), 502

# NOTE: Payments are handled exclusively by Firebase Functions (prepareCheckout +
# signed Stripe webhook). Agents and this tool server MUST NOT create payment intents,
# checkout sessions, or orders; agents may prepare a purchase but the user explicitly
# confirms every payment in the trusted UI.

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
