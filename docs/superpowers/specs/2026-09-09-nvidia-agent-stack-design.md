# NVIDIA agent stack integration design

## Status

Approved architecture; implementation not started.

## Problem and goals

Spresso needs one controlled path for multimodal shopping understanding, virtual try-on media generation, safe tool use, and browser automation. The design must use the existing Infisical `KYZO` project for provider secrets, preserve the existing media and checkout boundaries, and prevent a model or browser agent from executing arbitrary host actions or submitting a purchase without explicit user confirmation.

The design covers Nemotron 3 Nano Omni 30B A3B, NeMo Guardrails, NemoClaw/OpenShell, OpenClaw, semantic intent routing, video/image try-on, and the existing MCP/tool services. It does not claim that Omni is a video renderer: Omni is the multimodal understanding and planning model; synthesis remains a replaceable media-provider concern.

## Trust boundaries and components

1. **Client and trusted confirmation UI**: authenticated Spresso web/mobile surfaces collect consent, display intent, show checkout totals, and confirm consequential actions.
2. **Orchestration API**: authenticated server entry point normalizes requests, enforces rate/budget/idempotency limits, and never sends provider secrets to models or clients.
3. **Infisical KYZO**: runtime secret source. Secret names, environment paths, and access policies are configuration; values never enter source, generated bundles, logs, or prompts.
4. **Guardrails service**: NeMo Guardrails runs fail-closed input, retrieval, output, tool-call, and tool-result checks. Its IORails layer validates declared tool names and JSON Schema but does not execute tools.
5. **Nemotron gateway**: a provider adapter for Omni that returns validated intent and plan schemas. The model can propose actions but cannot grant authorization.
6. **Media gateway**: provider-neutral image/video generation boundary used by virtual try-on. It validates inputs and outputs, tracks asynchronous jobs, applies safety checks, and supports bounded retries and idempotency.
7. **OpenClaw gateway**: narrow MCP/tool contract for discovery, browsing, and checkout preparation. It cannot access payment credentials or invoke a final purchase operation.
8. **NemoClaw/OpenShell runtime**: isolated OpenClaw sandbox with deny-by-default filesystem and network policy, dedicated identity, resource limits, audit logs, and operator approval for policy exceptions.
9. **Existing Spresso systems**: Firestore user state, Cloud Functions/Run boundaries, MCP portal/tool server, cart intent, Stripe checkout, and existing virtual-try-on storage remain authoritative in their current domains.

## Request and action flow

1. The client sends an authenticated request with a correlation ID and optional user confirmation token.
2. The orchestration API validates the request and loads only the required runtime credentials from Infisical KYZO.
3. Input, image/video references, and retrieved text pass through content, jailbreak, topic, and PII rails.
4. Nemotron Omni classifies intent and returns a typed plan: answer, discover, compare, try-on, generate media, or prepare a tool action.
5. The API checks policy and authorization against the typed plan. Model output cannot elevate privileges or bypass user consent.
6. For tools, Guardrails validates the tool name and arguments, the API validates authorization, and OpenClaw executes only inside NemoClaw/OpenShell.
7. Tool results return through result-linkage/schema validation and content/output rails before reaching the model or client.
8. Media requests run through the Media gateway. Outputs are schema-validated, stored through the existing storage boundary, and returned as customer-facing status.
9. Purchase preparation stops at a trusted UI confirmation. Only the user-confirmed checkout path can call Stripe; OpenClaw and models cannot submit orders, enter payment credentials, or claim success.

## Provider roles

### Nemotron Omni

Use Omni for multimodal interpretation of product/user images and videos, semantic intent detection, outfit/fit reasoning, and structured tool-plan proposals. The gateway must validate a JSON schema for every result and reject free-form action instructions. Model IDs, endpoint protocol, context limits, and serving mode must be confirmed against current NVIDIA documentation before implementation.

### Video and virtual try-on

Keep `MediaGateway` independent of the understanding model. Add a video provider adapter only after verifying the current NVIDIA generation API or an approved external provider. Preserve the existing Gemini/Higgsfield adapters during migration, with explicit provider selection and no mock fallback. Every output must include media type, HTTPS/data URL validation, provider, job ID, content-safety decision, and retention metadata.

### NeMo Guardrails

Configure separate rails for input content, jailbreaks, topic scope, PII, retrieval/tool input, tool-call output, and final response output. Enable IORails only with exact direction-specific flow names and declared JSON Schemas. Fail closed on unknown tools, malformed arguments, unlinked results, schema errors, and guardrail service failures.

### NemoClaw and OpenClaw

OpenClaw is the execution driver; NemoClaw/OpenShell is the containment and policy layer. The sandbox receives only short-lived, scoped credentials through approved bindings. Network destinations are an explicit allowlist, filesystem writes are limited to the sandbox workspace and temporary paths, downloads/uploads are bounded and scanned, and browser sessions are isolated. Policy changes require review and verification; OpenShell is the durable policy source of truth.

## Secret and environment design

- Link the Spresso checkout to Infisical project `KYZO` without changing or copying the existing secret value.
- Define separate environments/paths for development, staging, and production.
- Use distinct secret names for NVIDIA inference, media providers, browser providers, and webhook/signing credentials.
- Inject secrets only in server-side Functions/Run/NemoClaw bindings. Never expose them to React/Kotlin bundles, browser JavaScript, model context, tool results, or logs.
- Add startup checks that report only presence and provider health, never secret values.
- Rotate and audit access through Infisical; deployment identities receive least-privilege read access to only the paths they need.

## Failure handling and safety

Provider failures return concise customer-facing messages and structured server telemetry. Retry only bounded transient failures with exponential backoff and idempotency keys. No failure path creates mock media, fake tool success, fake inventory, or fake purchase confirmation. Any ambiguity in authorization, tool provenance, sandbox policy, safety classification, or merchant quote blocks the action and requests user review.

## Verification strategy

- Contract tests for Infisical secret resolution, provider selection, typed Omni output, media job/output schemas, and tool schemas.
- Guardrails tests for unsafe input/output, PII masking/blocking, jailbreaks, unknown tools, malformed arguments, invalid result linkage, and guardrail outages.
- NemoClaw/OpenShell tests for filesystem escape, process/resource limits, denied network destinations, approved destination access, secret redaction, browser isolation, and policy drift.
- OpenClaw tests for prompt injection, untrusted webpage text, navigation/download restrictions, confirmation boundaries, and replay/idempotency.
- End-to-end tests for try-on image/video, provider fallback, job timeout, disconnect/retry, cart preparation, checkout confirmation, and Stripe webhook reconciliation.
- Operational checks for latency, cost budgets, denial rates, provider health, sandbox health, and audit-log completeness.

## Rollout order

1. Verify and link Infisical KYZO; add non-secret configuration and access checks.
2. Extract provider-neutral model and media gateways around existing code.
3. Add typed Nemotron Omni routing in shadow mode.
4. Deploy Guardrails in observe-then-enforce mode for non-financial requests, then fail-closed enforcement.
5. Deploy one NemoClaw/OpenShell sandbox with the minimum OpenClaw tools and egress policy.
6. Enable try-on media jobs behind server-side rollout configuration.
7. Enable browsing and checkout preparation; keep final purchase exclusively in trusted UI.
8. Review telemetry and security evidence before expanding traffic.

## Nested skill execution plan

1. `convex-env` and Infisical CLI verification for KYZO paths and runtime bindings.
2. `nemotron-customize` for any Nemotron-native step/config; `nvidia-skill-finder` and `nemo-retriever` for current model/serving references.
3. `security-threat-model` and `security-best-practices` for trust-boundary and secret/tool reviews.
4. Official NeMo Guardrails documentation for content, PII, jailbreak, and IORails configuration.
5. Official NemoClaw/OpenShell documentation for installation, sandbox hardening, network policy, and lifecycle checks; no dedicated local NemoClaw/OpenClaw skill is currently installed.
6. `convex-authz`, `convex-agent`, and MCP/tool contract review for authenticated action boundaries.
7. `test-driven-development` for contract and failure-state tests.
8. `writing-plans` after this spec is reviewed, followed by `executing-plans` and `verification-before-completion` during implementation.

## Out of scope

This design does not install NemoClaw/OpenClaw, change Infisical secrets, select an unverified video model, add autonomous purchasing, or create new mock providers. Those actions require the implementation plan and the provider/policy values identified above.
