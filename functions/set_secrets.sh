#!/bin/bash
set -euo pipefail

: "${STRIPE_SECRET_KEY:?Set STRIPE_SECRET_KEY in your secret manager environment}"
: "${STRIPE_PUBLISHABLE_KEY:?Set STRIPE_PUBLISHABLE_KEY in your secret manager environment}"

printf '%s' "$STRIPE_SECRET_KEY" | npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY --project get-spresso
printf '%s' "$STRIPE_PUBLISHABLE_KEY" | npx firebase-tools functions:secrets:set STRIPE_PUBLISHABLE_KEY --project get-spresso
