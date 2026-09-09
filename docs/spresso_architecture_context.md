# Spresso Architecture Context

This document is the persistent architecture source of truth for future agents. It replaces earlier assumptions about a deployed `spresso-5561f` environment and a web-first entry point. The project identifier changed to `get-spresso`; the previously approved Spanner global-catalog and Cloud Run tool-server decisions remain in force.

## Current architecture correction (owner-confirmed)

The active rebuild target is Convex plus the ChatGPT Apps SDK/agent surface. New application state, agent orchestration, trial/entitlement state, media metadata, and commerce workflow state belong in Convex. The ChatGPT Apps SDK surface is a separate MCP boundary and must expose only capabilities that have an authenticated, reviewed contract. Do not invent Convex or Bunny URLs: obtain them from the CLI/deployment and store credentials in the deployment vault.

This section is authoritative for the active rebuild. The later Firebase-first launch section records historical architecture decisions and migration constraints; it does not authorize new Firebase/Genkit implementations for the Convex rebuild.

Owner deployment constraint: Google Cloud, Firebase, Genkit, and Cloud Run are not active services for this rebuild. Do not propose or deploy the MCP server, web app, catalog gateway, or media boundary on Google infrastructure. The MCP server requires a separately authorized non-Google HTTPS host; until that host and its secret vault are configured, deployment is blocked.

Bunny Storage/CDN is the mandatory production media delivery provider for generated images, completed short videos, and static media. Production code must fail closed when Bunny configuration is missing; there is no Firebase/Convex media fallback. Tests may inject a contract-compatible media store to test application behavior without a live CDN, but that test adapter is not a production path.

## Confirmed product scope

Spresso is a native-first conversational commerce assistant. It discovers products, reasons over camera and wearable input, manages carts and personal collections, and can initiate purchases after explicit human confirmation. Spresso does not own inventory and must not represent a payment, merchant acceptance or fulfillment event as complete until the responsible external system confirms it.

### Visual input semantics (do not conflate these paths)

- **Lens is screen inspection, not camera input.** The user explicitly shares/captures the current phone screen through Android `MediaProjectionScreenCapture`; the Lens widget analyzes what is visible on that screen and returns product regions and discovery listings. It is not a live screen-sharing session, a gallery photo picker, or a physical-camera flow.
- **Phone camera is physical-world input.** CameraX and ML Kit support object detection, image labeling, sampled live-vision context for chat, and explicit photo/video capture for virtual try-on. Camera permission is not required for the Lens screen-capture path.
- **Virtual try-on is generated media.** A user photo/video plus selected garment and fit context produces an AI-generated still image or video. It is not a 3D mesh, 4D simulation, body scan, AR overlay, or measurement guarantee.
- **Meta wearable camera is a separate DAT path.** DAT camera/audio supplies visual context to Gemini Live and bounded shopping/grocery tools; it is not the Lens widget and cannot submit payment or orders.

### Feature inventory for context and verification

Future audits must account for every entry point: authentication/onboarding and fit profile; Convex AI chat and streaming; text product discovery; Lens screen inspection; CameraX physical-camera object detection, image labeling, live-vision context, and photo/video capture; screen-capture privacy and cancellation; image/video virtual try-on; wardrobe/gallery import and AI outfit curation; Meta DAT registration, permissions, session lifecycle, camera/display/audio capabilities and tool-call ledger; ChatGPT Apps SDK/MCP read-only discovery; cart intent state; fresh merchant quote; human-approved Stripe checkout; signed payment webhooks; orders, returns and delivery state; Bunny media upload/signed delivery/retention; 14-day trial and future entitlements; rate limits, idempotency, retries, prompt-injection resistance, privacy, audit logging, and deployment smoke tests.

The primary release client is the Kotlin Multiplatform Android application in `composeApp/`. Android uses AndroidX Navigation 3. Phone and tablet surfaces follow the app's Material 3 design system. Meta glasses surfaces are a separate design domain and use only the Meta DAT Display DSL after consulting the DAT MCP or installed `mwdat-android` skills.

## Environment state

- Firebase/GCP project `get-spresso` (project number `426485634252`) is CLI verified and active.
- Default Hosting site is `https://get-spresso.web.app`; it returns HTTP 404 until the first Hosting release is deployed.
- Firebase apps are registered for the legacy Android application ID `com.spresso19` and the Spresso Web companion. This identifier is not the product name.
- Firestore `(default)` is Standard edition, Native mode, `nam5`, realtime updates enabled and delete protection enabled. Repository Security Rules and indexes were deployed successfully on 24 August 2026.
- Cloud Functions and Cloud Run APIs are disabled, and no Cloud Storage bucket was found. Their endpoints must not be represented as live.
- `spresso-5561f` and `spresso-19` are stale identifiers.
- Firebase Authentication is initialized with Google, email/password and anonymous sign-in. Phone/SMS remains disabled until a deliberate regional allowlist, billing and abuse-defense policy is approved.
- Cloud Functions, Cloud Run, App Check, Vertex AI, Gemini API and Secret Manager APIs are disabled. Do not assume billing, secrets, service accounts or other deployed services exist; verify each resource before mutation or release claims.

## Legacy launch architecture reference

The following Firebase-first design is retained as migration history and a record of approved provider boundaries. It is not the active application state model for the Convex rebuild above. Do not add new code against it unless a migration ticket explicitly requires that boundary.

Use a Firestore-first Google Cloud architecture:

1. Firebase Authentication identifies users; App Check protects callable and HTTPS entry points.
2. Firestore owns user-scoped operational state: profiles, preferences, carts, conversations, saved items, provider snapshots, purchase attempts, order/receipt views and webhook-event deduplication.
3. Cloud Functions v2 performs authenticated privileged writes, AI tool orchestration, trusted merchant quote validation, payment-intent creation, signed-webhook processing and fulfillment-provider calls.
4. Spanner remains the approved global-catalog boundary for globally shared catalog/search data; it must not become an unreviewed second store for user workflow state.
5. Cloud Run remains the approved containerized tool-server/provider boundary for workloads that do not belong inside a Function; deploy immutable images with explicit IAM and secret bindings.
6. Stripe is the payment and financial system of record. Firestore stores only non-sensitive processor references, idempotency state and the customer-facing purchase lifecycle.
7. Merchant/provider APIs remain authoritative for price, availability, acceptance and fulfillment. Spresso does not reserve or decrement stock.
8. Cloud Storage stores user-authorized media under explicit access and retention policies.
9. Product discovery uses retailer/search providers. Firestore can cache normalized results while Spanner owns the approved global catalog boundary; neither is treated as an unbounded universal full-text search engine without verified indexes and cost controls.

Data Connect/PostgreSQL, Cloud SQL and Redis are not required for launch. Spanner and Cloud Run are not legacy artifacts: they are approved architecture boundaries, although their APIs, images, IAM and deployments must still be verified before cloud mutation or release claims. Any new store or dual write requires a concrete ownership decision, cost analysis, migration path and tests.

## Suggested Firestore ownership

| Domain | Suggested ownership |
| --- | --- |
| Profiles and preferences | `users/{uid}` and private user subcollections |
| Carts and saved products | user-scoped documents/subcollections |
| Conversations | conversation metadata plus bounded message subcollections |
| Product discovery cache | normalized, expiring provider snapshots with source and quote timestamps |
| Purchase idempotency | server-only `purchaseAttempts/{idempotencyKey}` |
| Orders and receipts | server-written records keyed by processor/merchant references |
| Webhook deduplication | server-only event records keyed by provider event ID |
| Media | Cloud Storage objects with Firestore metadata and retention state |

Security Rules must deny client writes to payment, receipt and webhook collections. Sensitive mutations go through authenticated, App-Check-protected Functions. Transactions are used only for application-owned atomic state—not for pretending to transact against retailer inventory.

## When SQL would become justified

Add a relational store only if the product later owns requirements such as merchant inventory, double-entry accounting, vendor settlement, complex cross-entity reporting, or relational constraints that cannot be expressed safely and economically in Firestore. Analytics can be exported to BigQuery without putting an operational SQL database in the purchase path.

## Known repository mismatch

The repository still contains Data Connect schemas, Cloud SQL/Redis clients, Terraform resources, stale Firebase IDs and checkout code that models local stock. Data Connect/Cloud SQL/Redis paths describe prior experiments, while the Spanner global-catalog and Cloud Run tool-server resources are approved but not proof of live deployment. All resources still require deliberate `get-spresso` verification, ownership checks and deployment evidence before release.
