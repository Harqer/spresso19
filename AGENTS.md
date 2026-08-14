# AGENTS.md - Spresso Project Instructions & Guidelines

## 1. User Immersion & Clean Customer UI (Strict Rule)
- **Live Response Streaming**: The chat assistant streams natural text responses token-by-token in real time.
- **NO Internal AI / Backend Jargon in UI**: Never output or render technical system messages, database statuses, or internal pipeline steps (e.g. NEVER output "Neon connected now!", "Executing image generation now", "Passed to redis io now", "System initialized with Gemini 3.6 Flash...", or raw thinking debug boxes).
- **Natural Personal Shopper Persona**: The chat assistant must communicate strictly as **Spresso AI Personal Shopper**, maintaining a seamless, elegant, and immersive e-commerce shopping experience.
- **Loading States**: Use clean customer-facing indicators (e.g. "Finding recommendations...") rather than technical status strings (e.g. "Gemini is generating response...").

## 2. Server-Side Log Management
- **Backend Logging Only**: Any model operational traces, tool logs, or system errors are logged server-side or sent to Firebase Crashlytics (`/logs` collection in Firestore), NEVER rendered directly into the customer's chat interface.
- **Privacy & Cleanliness**: Ensure user chat messages only contain clear, finalized text responses and relevant product recommendations.

## 3. Incident Recovery Protocol
If an agent accidentally outputs raw thinking streams, debug panels, or backend jargon into the user UI:
1. Inspect `src/components/PersonalAIShopperChat.tsx` and `server.ts`.
2. Remove any `<p>` or `<div>` elements or prompt lines generating technical status text or backend jargon.
3. Replace technical status strings with polished customer-facing copy.
4. Run `lint_applet` and `compile_applet` to confirm a clean build.

## 4. Production Engineering & Zero Mock Protocol (Strict Rule)
- **No Mock, Placeholder, or Dummy Stubs**: Production paths and handlers must execute real database queries, API invocations, and backend logic. Never insert hardcoded fallback mock datasets or fake stub APIs.
- **No Fallback to Mock on Button/Action Failure**: If a backend call, button action, or database transaction fails, you are strictly forbidden from falling back to dummy or mock success states.
- **Production Button & Action Failure Messaging**:
  1. Display concise, action-specific, user-friendly notifications upon failure (e.g., "Failed to save settings. Please try again." or "Unable to process request right now. Please try again."). Never output raw stack traces, technical error codes, or debug warnings into the user interface.
  2. Implement exponential backoff retry policies for transient network or service glitches.
  3. Emit detailed failure telemetry server-side via Google Cloud Logging or Firebase Crashlytics (`/logs` in Firestore) without breaking the customer UI.

## 5. Security & Secrets Management
- **Vault-Driven Secrets**: Secrets, keys, and connection strings must be supplied via secure environment secret vaults or GCP Secret Manager. Never store unencrypted secrets in plain `.env` files or expose them in client-side bundles.
- **Strict CORS & API Security**: Enforce restrictive Cross-Origin Resource Sharing (CORS) policies, origin validation, CSRF protections, and strict request header validation across all API endpoints.
- **Configuration & Dependency Verification**: Validate all active credentials, server endpoints, and functional dependencies prior to enabling feature actions.

## 6. Enterprise System Architecture, High Availability (99.999999%) & Scale
- **High Availability & Multi-Region Resiliency**: Architect for extreme availability (99.999999% reliability target) using multi-region redundancy, zero-downtime failover, automated health checks, and active-active/active-passive database replication.
- **Rate Limiting & Circuit Breakers**: Protect API servers and database layers from traffic spikes and cascade failures using token-bucket rate limiters, request throttling, and automated circuit breakers.
- **Edge Caching & CDN Distribution**: Offload static assets and API payloads to edge locations using Cloud CDN and distributed Redis / memory caches to minimize latency for global traffic.
- **Batching, Connection Pooling & DB Orchestration**: Utilize optimized connection pools, query indexing, batch reads/writes, and scale-to-zero / auto-scaling configurations for Cloud SQL and Firestore.
- **Gemini Model Garden Intelligent Routing**: Route AI requests dynamically across Gemini Model Garden aliases (e.g., Flash for high-throughput real-time interactions, Pro for complex reasoning) with token window optimization to maximize cost efficiency and sub-second latency.
- **Idempotency & Fault-Tolerant Operations**: Ensure state-changing API operations (e.g., purchases, state updates) use idempotency keys to prevent duplicate execution during network retries.
- **Telemetry & Real-Time Monitoring**: Maintain complete server-side instrumentation using Google Cloud Logging, Cloud Monitoring, and Firebase Crashlytics for instant observability and proactive anomaly detection.

## 7. Zero UI Overhead & Pure Semantic Intelligence
- **Natural Intent Classification**: Capabilities such as web research, local physical store shopping, price comparison, and location context must be detected automatically from the user's natural language prompt and browser context server-side.
- **No Unrequested UI Buttons**: Do not create or require dedicated frontend mode toggles or extra UI buttons for semantic AI capabilities unless explicitly requested by the user. Keep the interface clean, elegant, and unobtrusive.


## 8. Testing Strategy
- **Comprehensive Testing Setup**: For information on running unit tests, instrumented tests, and screenshot tests, see the authoritative documentation at [docs/testing.md](docs/testing.md).

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
