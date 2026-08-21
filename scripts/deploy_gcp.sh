#!/bin/bash
set -e

# NOTE: This script assumes you have authenticated via 'gcloud auth login'
# and have selected the appropriate project via 'gcloud config set project spresso-5561f'.
# It also assumes you have the necessary IAM permissions to provision these resources.

PROJECT_ID="spresso-5561f"
REGION="us-central1"

echo "========================================"
echo " Starting Spresso GCP Infrastructure Provisioning"
echo "========================================"

# 1. Enable Required APIs
echo "Enabling necessary GCP APIs..."
gcloud services enable spanner.googleapis.com \
    run.googleapis.com \
    compute.googleapis.com \
    firebasedatabase.googleapis.com

# 2. Provision Google Cloud Spanner (PostgreSQL dialect)
echo "Provisioning Cloud Spanner Instance (PostgreSQL dialect)..."
gcloud spanner instances create spresso-global-db \
    --config=regional-us-central1 \
    --description="Spresso Global Catalog Database" \
    --nodes=1

echo "Creating PostgreSQL dialect Spanner database..."
gcloud spanner databases create spresso-db \
    --instance=spresso-global-db \
    --database-dialect=POSTGRESQL

# 3. Provision Firebase Realtime Database
echo "Provisioning Firebase Realtime Database for Live Sync..."
# Usually provisioned via Firebase CLI, but we ensure the API is on.
firebase database:instances:create spresso-5561f-default-rtdb --project $PROJECT_ID || echo "RTDB instance may already exist."

# 4. Deploy to Cloud Run (Web Server)
echo "Deploying Node.js backend to Cloud Run..."
gcloud run deploy spresso-web \
    --source . \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="USE_SPANNER_PG_ADAPTER=true,NODE_ENV=production" \
    --max-instances=10

# Get the deployed Cloud Run service URL
SERVICE_URL=$(gcloud run services describe spresso-web --region $REGION --format 'value(status.url)')

# 5. Configure Global HTTP(S) Load Balancer, Cloud CDN, and Cloud Armor
echo "Setting up Serverless NEG for Global Load Balancer..."
gcloud compute network-endpoint-groups create spresso-neg \
    --region=$REGION \
    --network-endpoint-type=serverless  \
    --cloud-run-service=spresso-web

echo "Creating Backend Service with Cloud CDN enabled..."
gcloud compute backend-services create spresso-backend-service \
    --load-balancing-scheme=EXTERNAL \
    --global \
    --enable-cdn \
    --cache-mode=CACHE_ALL_STATIC

echo "Adding NEG to Backend Service..."
gcloud compute backend-services add-backend spresso-backend-service \
    --global \
    --network-endpoint-group=spresso-neg \
    --network-endpoint-group-region=$REGION

echo "Creating URL Map..."
gcloud compute url-maps create spresso-url-map \
    --default-service spresso-backend-service

echo "Creating Target HTTP Proxy..."
gcloud compute target-http-proxies create spresso-http-proxy \
    --url-map=spresso-url-map

echo "Creating Global Forwarding Rule (Frontend IP)..."
gcloud compute forwarding-rules create spresso-forwarding-rule \
    --load-balancing-scheme=EXTERNAL \
    --network-tier=PREMIUM \
    --global \
    --target-http-proxy=spresso-http-proxy \
    --ports=80

# 6. Configure Google Cloud Armor
echo "Creating Cloud Armor Security Policy..."
gcloud compute security-policies create spresso-waf-policy \
    --description "Spresso Web Application Firewall"

echo "Adding SQL Injection (SQLi) & Cross-Site Scripting (XSS) rules..."
gcloud compute security-policies rules create 1000 \
    --security-policy spresso-waf-policy \
    --expression "evaluatePreconfiguredExpr('sqli-v33-stable') || evaluatePreconfiguredExpr('xss-v33-stable')" \
    --action "deny-403"

echo "Attaching Cloud Armor Policy to Backend Service..."
gcloud compute backend-services update spresso-backend-service \
    --global \
    --security-policy spresso-waf-policy

echo "========================================"
echo " Infrastructure Provisioning Complete!"
echo " Cloud Run Service: $SERVICE_URL"
echo " Note: DNS propagation for the Load Balancer IP may take 5-10 minutes."
echo "========================================"
