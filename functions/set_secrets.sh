#!/bin/bash
# Script to set secrets (requires firebase-tools)
echo "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" | npx firebase-tools functions:secrets:set STRIPE_SECRET_KEY --project spresso-5561f
echo "pk_live_51TdqJWEJP7exC6SoZn7SVRmsqnNOGaiBF4S2A6JdbTtKpkxGE3tQTcUsWtwVQzVDCYzwCy0kfKyPPV80F3IIdwFx0068Whhef5" | npx firebase-tools functions:secrets:set STRIPE_PUBLISHABLE_KEY --project spresso-5561f
