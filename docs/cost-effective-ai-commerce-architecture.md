# Cost-effective AI commerce architecture

## Decision

Spresso can use Firestore without introducing Postgres for the discovery and receipt-projection use case. Stripe remains the financial system of record. Firestore stores user-scoped application state, processor references, idempotency records, research results, and customer-facing receipts; it does not store card data, recreate Stripe's ledger, or manage retailer inventory.

This keeps the launch path aligned with the repository's Firestore-first architecture. Existing Data Connect/Postgres and Redis code should be treated as legacy or exploratory until a measured requirement justifies a migration; do not add dual writes.

## Request-cost routing

Route every request into one of four budgets:

1. **Local discovery:** Firestore/index lookup and deterministic filtering. No model call when structured data is sufficient.
2. **Assistant response:** one streaming Gemini Flash-class call with a bounded history and output limit.
3. **Deep research:** only when the user asks for current, comparative, or source-backed research. Run the minimum web queries, cache normalized results, and cap retries.
4. **Media:** only after an explicit virtual-try-on or 360 action. Run asynchronously, cache by input hash, and use Gemini first with Higgsfield as the configured fallback for eligible video work.

Do not automatically run research, image generation, video generation, or Live sessions for ordinary chat. The UI should show only the useful answer or product result, not model thoughts, tool traces, badges, or backend status.

## Storage boundaries

```text
Stripe
  payment intents, charge state, refunds, disputes, processor ledger
        │ verified, idempotent webhooks
        ▼
Firestore
  users/{uid}/receipts/{paymentIntentId}
  stripeEvents/{eventId}
  researchCache/{queryHash}
  mediaJobs/{jobId}
  user quotas, preferences, saved products
        │
        ├── verified search/index provider for full-text and fuzzy discovery
        └── Cloud Functions v2 / Genkit tool boundary
```

Firestore is schemaless and supports the receipt projection, but it is not automatically a full-text search engine. Start with bounded filters and normalized fields; add a dedicated search provider only after query volume and relevance data justify its cost.

## Highest-value cost controls

- Centralize model IDs, token limits, timeout limits, and provider selection in one server-side registry.
- Add a request ID, authenticated user scope, intent, model, token counts, cache hit, provider latency, and estimated cost to structured logs.
- Cache by a canonical query hash. Suggested starting TTLs: product research 6–24 hours, price/availability 5–15 minutes, and media results until their source inputs change.
- Add idempotency keys for Stripe webhook projection and media jobs. A repeated tap must not create another payment or another expensive generation.
- Summarize older chat turns and cap tool-result size before sending context back to Gemini.
- Cancel streams when the client disconnects; close Live sessions on inactivity; use exponential backoff with a hard retry count.
- Require explicit user intent for VTO/360 and enforce per-user daily media limits and concurrent-job limits.
- Resize and compress uploaded images before generation. Prefer signed Cloud Storage URLs over embedding large base64 payloads.
- Use batch/flex inference for offline catalog enrichment where supported; reserve interactive/priority capacity for user-facing requests.
- Set Google Cloud budgets and alerts before production traffic. Free quotas are quotas, not a guaranteed $0 monthly bill.

## Current code audit

- Genkit CLI setup is present in `functions/package.json`; `npm run genkit:ui` builds the functions and starts Genkit against the compiled registration entrypoint.
- `functions/src/ai/dev.ts` imports the active tools and flows, and the registration smoke test printed `Genkit flows and tools loaded.`
- Chat streaming is already implemented, but normal commerce requests can still reach research/model work without a cache or an explicit cost budget.
- Media fallback performs multiple Gemini attempts and Higgsfield polling, but needs input-hash caching, job idempotency, bounded polling/backoff, and per-user quotas before broad exposure.
- Catalog caching exists but should be connected to the shopper request path before adding more model calls.
- Model IDs are distributed across the AI code. A registry will make fallback, pricing, and deprecation changes safe.
- Local Genkit startup reported missing Google Cloud project/auth telemetry configuration. That is a local environment issue, not evidence that production flows are deployed.
- The CLI install reported dependency audit findings. Do not run an automatic audit fix; triage and upgrade the dependency tree separately.

## Payment workflow

1. The server creates a Stripe PaymentIntent or Checkout Session with an idempotency key.
2. Stripe sends the signed webhook.
3. The webhook verifies the signature and deduplicates on `event.id`.
4. A Firestore transaction writes the processor reference and customer-facing receipt projection.
5. The client reads only the authenticated user's receipt state.

Never mark a purchase successful from the client callback alone, and never use Firestore as a replacement for Stripe's payment, refund, dispute, or settlement records.

## KMP navigation alignment

Keep the serializable `NavKey` hierarchy and state-driven back stack in `commonMain`. Android, iOS, and other targets should render the shared navigation state; platform-specific code should be limited to capabilities such as deep links, browser history, and native payment/device integrations. Do not create separate Android and iOS navigation graphs just to support the cost architecture.

## Rollout

### Phase 1 — guardrails

Add the model registry, token/output caps, request budgets, structured cost telemetry, authenticated quotas, and graceful cancellation. No UI mode buttons are required; classify intent server-side.

### Phase 2 — cache and idempotency

Add canonical query caching, research-result reuse, Stripe event deduplication, and idempotent media jobs. Measure cache-hit rate and cost per successful user task.

### Phase 3 — media control

Move VTO/360 generation behind an asynchronous job boundary with signed outputs, bounded polling, input deduplication, and daily limits. Keep Higgsfield as fallback only when the primary Gemini media path is unavailable or unsuitable.

### Phase 4 — search decision

Measure Firestore filter performance and relevance. Add a dedicated search provider only if fuzzy/full-text relevance or scale warrants its recurring cost.

### Phase 5 — legacy cleanup

Remove or isolate unused Postgres/Data Connect/Redis paths after traffic evidence confirms they are not part of the launch path. Do not migrate them merely because payments exist.

## Cost conclusion

The economical design is not “NoSQL makes everything free.” It is: one operational database, Stripe-owned payment state, server-side AI routing, aggressive reuse of research, explicit media jobs, bounded model usage, and billing alerts. That preserves flexibility now and leaves a clean path to add a relational ledger only if Spresso later owns inventory, multi-party settlement, or accounting reconciliation.
