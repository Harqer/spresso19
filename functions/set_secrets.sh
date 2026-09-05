#!/usr/bin/env bash
# Validate the Secret Manager bindings used by Firebase Functions.
# This script intentionally never reads or prints secret payloads.
set -euo pipefail

: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT to the verified Firebase/GCP project ID.}"
PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
REQUIRED_SECRETS=(
  STRIPE_SECRET_KEY
  STRIPE_PUBLISHABLE_KEY
  STRIPE_WEBHOOK_SECRET
  HIGGSFIELD_API_KEY_ID
  HIGGSFIELD_KEY_SECRET
  GEMINI_API_KEY
  SERPAPI_API_KEY
  PARALLEL_API_KEY
  CLOUDFLARE_ACCOUNT_ID
  CLOUDFLARE_API_TOKEN
  CDP_API_KEY_NAME
  CDP_API_KEY_PRIVATE_KEY
)

command -v gcloud >/dev/null 2>&1 || {
  echo "gcloud is required to validate Secret Manager configuration." >&2
  exit 1
}

for secret_name in "${REQUIRED_SECRETS[@]}"; do
  gcloud secrets describe "${secret_name}" --project "${PROJECT_ID}" >/dev/null
  state="$(
    gcloud secrets versions describe latest \
      --secret "${secret_name}" \
      --project "${PROJECT_ID}" \
      --format='value(state)'
  )"
  if [[ "${state}" != "ENABLED" ]]; then
    echo "Secret ${secret_name} has no enabled latest version." >&2
    exit 1
  fi
done

echo "Required Firebase Functions secrets are present in Google Secret Manager."
echo "Deploy with: firebase deploy --only functions --project ${PROJECT_ID}"
