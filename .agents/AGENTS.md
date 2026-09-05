# Workspace Rules

## Persistent Context Memory

The user prefers an agent that retains long-term memory of this specific architecture (Spresso, Kotlin Multiplatform Android, Firebase-first serverless services, Gemini Live and Meta DAT) so they do not have to repeatedly explain the context.

To achieve this, ALWAYS leverage the principles of **Recursive Language Models (RLMs)** to externalize context:

1. **Self-Documentation (Context Engineering Pipeline)**: Always document architectural decisions, schema states, and current UI layouts into markdown artifacts within the workspace context (e.g., maintaining an updated `architecture_context.md`, `schema.md`, or similar). 
2. **Proactive Reading**: When beginning a new task, use your tools (like `view_file` or `grep_search`) to aggressively read the existing codebase and these generated context documents *before* asking the user for clarification.
3. **Hermes / Context Retention**: By reading the local `.md` artifacts and project config files proactively, you simulate a persistent memory state (Hermes/RLM paradigm). Treat the file system as your extended context window.

Whenever the user asks a question about the project, assume the answer is already in the codebase or the generated artifacts, and use your tools to find it.

## Persistent Architecture Context
The canonical architecture context is `docs/spresso_architecture_context.md`. When waking up for a new session or encountering ambiguity about the stack, always read this file first.

**Firebase/GCP Environment:**
- CLI-verified project ID/display name: `get-spresso`; project number: `426485634252`.
- CLI-verified Hosting origin: `https://get-spresso.web.app`. It currently returns HTTP 404 because no Hosting release has been deployed.
- Registered apps: legacy Android application ID `com.spresso19` and the Spresso Web app. The product name is always **Spresso**; never call it “Spresso19.” Firestore `(default)` is Standard/Native in `nam5` with delete protection and deployed rules/indexes.
- Firebase Authentication has Google, email/password and anonymous providers enabled. Phone/SMS remains disabled pending an approved regional and abuse-control policy.
- Cloud Functions, Cloud Run, App Check, Vertex AI, Gemini API and Secret Manager APIs are disabled, and no Cloud Storage bucket was found as of 24 August 2026. Never claim those services or their URLs are live until a fresh CLI check succeeds.
- `spresso-5561f` and `spresso-19` are stale identifiers and MUST NOT be used for deploys, secret lookups or resource creation.
- Never infer billing, credentials, secrets or deployed services from repository files. Verify each service before cloud mutation.

**Core Architecture (STRICT):**
- **Primary client**: Kotlin Multiplatform with a native Android release target and AndroidX Navigation 3. The React 19 SPA is a companion surface, not the primary release entry point.
- **Operational data**: Firestore-first for user and commerce workflow state. Firebase Auth, App Check, Cloud Functions v2 and Cloud Storage form the managed launch backend; approved Spanner global-catalog and Cloud Run tool-server boundaries remain part of the Google Cloud architecture when their verified deployments are deliberately enabled.
- **Payments**: Stripe is the financial system of record. Firestore stores idempotency, processor references, receipts and customer-facing order state. Spresso does not own or decrement merchant inventory.
- **Discovery catalog**: Product records are discovery/listing metadata, not Spresso-owned inventory. Never add stock or fake availability defaults; verify current merchant price and availability at the merchant/payment boundary.
- **Agentic security**: Agents may research and stage checkout but may not submit orders, move funds, sign wallet transactions, or enter payment credentials without explicit trusted-UI confirmation. Enforce authenticated tool calls, App Check, passkey/biometric confirmation, idempotency, transaction limits, secret redaction, and server-side audit logs. Never store seed phrases, private keys, PAN/CVV, or raw wallet credentials.
- **Current checkout mode (updated 2026-09-01)**: Spresso-controlled Stripe checkout is live for cart listings: the server quotes the price from a fresh merchant observation (`prepareCheckout`), the user confirms payment in the trusted UI, and the signed webhook creates the order. AI may prepare purchases but never submits payment or claims completion — explicit user confirmation is mandatory. Merchant-site handoff remains a fallback.
- **Agentic browsing**: Use isolated short-lived browser contexts, HTTPS-only navigation, outbound-domain allowlists, SSRF/download/upload controls, bounded requests, and prompt-injection-resistant schemas. Stop before payment, order submission, wallet signing, or account/security changes.
- **PQC readiness**: Keep cryptography agile. Use approved provider implementations for ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205) where supported, with reviewed hybrid migration and downgrade prevention. Never label a classical algorithm as PQC or invent a simulated PQC signature; support TLS 1.3 or successor.
- **Legacy data infrastructure**: Data Connect/PostgreSQL, Cloud SQL and Redis are not launch dependencies. Spanner remains approved for the global catalog boundary, and Cloud Run remains approved for the tool-server/provider boundary. Do not add dual writes to legacy stores or provision them without an explicit ownership and migration decision.
- **Target AI runtime**: Firebase Cloud Functions plus an explicitly approved Gemini/Agent runtime. No production AI runtime is currently deployed.
- **Current Chef implementation**: `agents/chef/agent.py` is an Antigravity SDK wrapper, not a discoverable Google ADK application. It has no ADK `root_agent`, `App`, Runner or production session service. Do not call it ADK or deployed Agent Engine code until that migration and deployment are verified.
- **PROHIBITED**: DO NOT hallucinate or propose a custom Node.js Express backend for WebSockets. The architecture is purely serverless (Firebase + Agent Engine).

## UI Badge & Overstatement Elimination Standard (STRICT USER MANDATE)
1. **PURCHASE CONFIRMATION ONLY**: The only badge or pill treatment allowed in customer UI is purchase confirmation after a real, server-confirmed purchase. Product and restaurant ratings use ordinary text with enterprise vector icons, never badge containers.
2. **NO OTHER BADGES**: DO NOT render match percentages, category/status chips, elevation or grounding labels, engineering statuses, decorative pills, or telemetry badges. Interactive Material 3 action/filter chips are allowed only when they are genuine controls, never status decoration.
3. **Rationale**: Badges clutter the immersive assistant and commerce experience and overstate system actions. Prefer clean hierarchy, natural language, semantic color, and direct content.

## Meta Wearables DAT Development Gate (STRICT USER MANDATE)
1. **REFERENCE DAT BEFORE EDITING**: Before changing any Meta wearable code, manifest metadata, dependency, permission, registration, session, stream, Display UI, or `com.meta.wearable.*` call, use `search_dat_docs` from the public DAT MCP or read the relevant installed `mwdat-android` skill. Never code from memory or generic Android guidance.
2. **DAT DISPLAY IS NOT MATERIAL 3**: Spresso phone/tablet UI uses Material 3. Glasses-rendered content uses only the DAT Display DSL and its `TextStyle`, `TextColor`, `ButtonStyle`, `IconName`, layout, and lifecycle conventions.
3. **NO UNREFERENCED WEARABLE CHANGE**: Record the DAT MCP result or skill consulted, handle typed `DatResult` and async errors, and validate with MockDeviceKit or the live DAT Inspector MCP when available. If neither MCP nor installed skills are available, stop instead of guessing.

## Google AI Development Gate (STRICT USER MANDATE)
1. **SELECT THE RIGHT GUIDE FIRST**: Before editing AI code, classify it as Genkit, direct Gemini API, Gemini Interactions, Gemini Live, or Python Google ADK. Read the matching installed skill before writing code: `developing-genkit-js`, `gemini-api-dev`, `gemini-interactions-api`, `gemini-live-api-dev`, or `adk-agent-builder`.
2. **ADK SKILL ROUTING**: Use `adk-architecture` for runner/session/workflow design, `adk-debug` for an existing agent that misbehaves, and `adk-style` for Python ADK edits. Use `adk-setup` only when setup is explicitly requested. Do not call custom wrappers, Genkit tools, Vertex Agent Engine, or Antigravity code “ADK” unless it uses the Google ADK package structure and exposes a discoverable `root_agent` or `App`.
3. **CURRENT DOCS ARE REQUIRED**: For Genkit, run the official CLI `docs:read` or `docs:search` command relevant to the change. For Gemini/ADK, use the Google docs MCP when available or current official docs. Verify model IDs against the exact API surface; ordinary Gemini generation models cannot be substituted into the Live API.
4. **PRODUCTION COMPLETION BAR**: Pin dependencies, validate structured outputs, bind every referenced secret to each exported Firebase function, propagate authenticated context into tools, and test callable envelopes, stream events, interruption/resumption, sessions, and deployment configuration. Compilation alone is insufficient.

## App Immersion & Backend Hiding Standard (NO BREAKING IMMERSION)
1. **Never Expose Internal Technical Names in the UI**: The user interface must remain fully immersive and consumer-focused. Never display internal backend technologies, framework names, or infrastructure details (such as "Kitesurf", "Cloudflare", "CDP", "PostgreSQL", or "Data Connect") in buttons, helper texts, log widgets, or user-facing messages.
2. **Abstract Automated Actions**: Keep automated backend pipelines invisible. Frame headless edge browser checkouts or catalog updates using standard, clean actions (e.g., "Add to Cart", "Confirm Order", or "Order Processing") rather than describing the underlying execution nodes or steps.
3. **No Redundant UI Additions**: The UI structure is frozen and complete. Do not inject debug outputs, execution trackers, or buttons that break the clean, premium styling of the application.

## Strict No Emojis & Enterprise Vector Icon Standard (MANDATORY USER RULE)
1. **STRICTLY NO EMOJIS IN UI**: Never use raw Unicode emoji characters for UI buttons, tabs, labels, actions, or status indicators across any codebase, repository, or frontend app (Android, Web, iOS, React, Flutter, etc.).
2. **ENTERPRISE VECTOR ICONS ONLY**: Always use official enterprise design system vector icons (such as Material 3 Icons (`androidx.compose.material.icons.Icons`), Lucide React icons (`lucide-react`), or Material Symbols) for all visual icons.

## 1. MANDATORY CONTEXT ACQUISITION (NEVER ASSUME)
1. **READ BEFORE YOU WRITE**: Before proposing or writing any code, you MUST use `grep_search` or `view_file` to locate the exact backend schema, API contract, or relevant files. NEVER assume you know how the backend works or hallucinate a schema. 
2. **FIND THE SOURCE OF TRUTH**: If you are working on UI and need data, find the exact Firestore contract, callable function, provider adapter, or route that supplies it. Legacy Data Connect/Postgres schemas are not authoritative unless an approved architecture decision explicitly reactivates them.

## 2. STRICT ZERO-MOCK PROTOCOL (POSITIVE DIRECTIVE)
1. **FAIL FAST ON MISSING DATA**: If you cannot find the actual backend schema, API endpoint, or data source for a feature, you MUST STOP. You are strictly forbidden from writing `delay()`, hardcoding placeholder arrays, or injecting mock data to make a UI "compile" or "look finished".
2. **EXPLICIT ERRORS ONLY**: If a backend call is unimplemented or missing, you must write `throw new Error("Missing Backend API - Needs Implementation")` or return standard HTTP 501 / RFC 7807 problem details. Do NOT catch errors silently and return empty lists. Do not fake success.
3. **HONEST & TRANSPARENT SYSTEM NOTICES**: If an API or live search fails at runtime, surface a clear error to the user (e.g. "Live product search is currently unavailable"). Never mask the error with fabricated dummy data.
## Event-Driven Error-Only CI Pipeline & No-Redundant-APK Rule (STRICT USER MANDATE)
1. **NO RECURRING SUCCESS NOTIFICATIONS OR POLLING**: The agent must NEVER poll or send periodic success status messages when GitHub Actions runs pass. Only engage when an actual failure occurs.
2. **ZERO LOCAL APK OVERHEAD**: Never invoke `./gradlew assembleDebug` or build `.apk` binaries locally unless the USER explicitly requests a build.




## Strict Prohibition of Developmental Bypasses & Local Setup Hacks (STRICT USER MANDATE)
1. **NO LOCAL SETUP OR DEV BYPASSES**: The codebase must remain in a production-ready state at all times. Never introduce or leave behind developmental bypasses such as `onDevLoginRequested`, `devOverrideUid`, or `token === "bypass"`/`"dummy"` authentication backdoors.
2. **PRODUCTION API KEY PRACTICES ONLY**: All API keys and environment variables must strictly follow production best practices (e.g., Vault-driven secrets or GCP Secret Manager). Developmental "quick starts" or local `.env` setup guidelines that compromise security are strictly forbidden.
3. **MANDATORY CLEANUP**: Any generated code meant for temporary local testing must be fully removed and replaced with actual production logic prior to completion.

## Proactive Best Practices & Skill Execution (MANDATORY RULE)
1. **PROACTIVE SKILL DISCOVERY**: Always proactively check for and utilize skills (e.g., `android-cli`, `navigation-3`, `jetpack-compose` rules) that are relevant to the active task, particularly for Jetpack Compose, System Architecture, and code execution.
2. **FOLLOW BEST PRACTICES UNCONDITIONALLY**: Never write "MVP", "quick hack", or non-standard code if it violates established enterprise best practices. If you are writing Jetpack Compose or System Design code, always apply the scalable, standard patterns from your skill guidelines and references first.

## Strict Prohibition of Automated Code Modification Scripts (MANDATORY RULE)
1. **MANUAL & RIGOROUS CHECKING ONLY**: When making codebase corrections, refactoring, or cleaning up unused imports/variables, NEVER write and execute generic, automated Python or shell scripts (e.g., regex scanners) to modify the codebase in bulk. Automated scripts are too broad and brittle for complex languages like Kotlin. 
2. **USE NATIVE LINTERS & MANUAL AUDITS**: Always do the rigorous work manually by relying on native compiler output, native linter warnings (e.g., `./gradlew lintDebug`), or language-aware tools, and manually verifying and applying the corrections yourself.
