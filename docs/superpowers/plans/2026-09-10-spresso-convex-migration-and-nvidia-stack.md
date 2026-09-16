# Spresso Convex Migration and NVIDIA Agent Stack Execution Plan

> **Status:** Approved execution index.
>
> **Purpose:** Combine the existing Convex migration plans and NVIDIA Agent Stack plan into one dependency-ordered todo list. Existing child plans remain the detailed implementation records; this file is the canonical order, correction layer, and completion gate.
>
> **Required workflow:** Use `superpowers:subagent-driven-development` when available; otherwise use `superpowers:executing-plans`. Write failing tests first. Inspect GitNexus impact before symbol edits. Run full GitNexus change detection before every commit. Never deploy, mutate production, create paid resources, delete remote resources, rotate secrets, or change DNS without fresh owner approval.

## Architecture decision

Firebase Authentication remains the identity provider and Firebase UID remains the external subject. Convex is the sole application database for user state, AI state, jobs, commerce workflow state, passkey state, entitlements, and bounded discovery metadata. Bunny owns production media and static bytes. Convex owns Spresso's internal commerce workflow and orchestration state. Stripe owns authoritative Stripe payment state for transactions processed through Stripe, including the corresponding PaymentIntent, charge, capture, refund, and processor status. The merchant owns authoritative merchant-side product pricing, availability, inventory, order acceptance, order status, fulfillment, cancellation, and merchant-side transaction state. RevenueCat owns Spresso digital-product entitlement truth. Spresso must not convert local workflow state into external payment or merchant truth; external states are updated only from authoritative provider evidence.

Firebase Functions, Firestore, Genkit, Pub/Sub, Data Connect, Spanner, Cloud SQL/PGAdapter, Firebase Storage, Firebase Hosting, and Cloud Run are migration or rollback boundaries only. They are not new permanent application owners for the Convex rebuild. Do not remove Firebase Auth.

The NVIDIA Agent Stack is part of the Convex architecture, not a parallel Firebase/Firestore architecture:

```text
Firebase Auth
    -> typed client gateway
    -> Convex authenticated functions and Agent components
       -> Nemotron/NIM intent gateway
       -> fail-closed NeMo Guardrails boundary
       -> verified media provider -> Bunny media store
       -> merchant/discovery adapters
       -> human-confirmed commerce state machine -> Stripe/merchant
    -> separate stateless MCP host for read-only Apps SDK discovery
       -> authenticated discovery adapter
NemoClaw/OpenShell runs only as a sandboxed tool worker behind the same policy boundary.
```

No model, MCP tool, sandbox, fallback provider, or client may submit payment, enter credentials, sign a wallet transaction, mutate inventory, or claim purchase completion.

## Source plans and precedence

Use these plans as child plans, in this order:

1. [`2026-09-05-cost-guardrails-backend-contracts.md`](2026-09-05-cost-guardrails-backend-contracts.md)
2. [`2026-09-05-convex-live-state-ai-migration.md`](2026-09-05-convex-live-state-ai-migration.md)
3. [`2026-09-08-convex-commerce-passkey-revenuecat.md`](2026-09-08-convex-commerce-passkey-revenuecat.md)
4. [`2026-09-08-chatgpt-apps-sdk-surface.md`](2026-09-08-chatgpt-apps-sdk-surface.md)
5. [`2026-09-05-bunny-media-cutover-finops.md`](2026-09-05-bunny-media-cutover-finops.md)
6. [`2026-09-09-production-convex-apps-sdk-transition.md`](2026-09-09-production-convex-apps-sdk-transition.md)
7. [`2026-09-09-nvidia-agent-stack-integration.md`](2026-09-09-nvidia-agent-stack-integration.md)

This file supersedes conflicting portions of older plans as follows:

- The Neon plan is superseded. Do not implement `2026-09-05-neon-commerce-passkey-migration.md`.
- The NVIDIA plan's Firestore job-state and permanent Firebase Functions assumptions are replaced by Convex job state, Convex Agent, Convex actions, and Bunny media.
- The legacy Firebase-first architecture section is historical only.
- A test adapter or injected contract adapter is not a production fallback and must never be returned as a successful production result.

## Required nested skills by domain

| Domain | Required skills before work |
|---|---|
| Process | `using-superpowers`, `subagent-driven-development` or `executing-plans`, `systematic-debugging`, `verification-before-completion` |
| Convex schema/functions | `convex-expert`, `convex-design`, `convex-docs`, `convex-reviewer`, `convex-authz`, `convex-test`, `convex-verify` |
| Convex data migration | `convex-migrate`, `convex-migrate-rehearse`, `convex-deploy-guard` |
| Security and prompts | `security-best-practices`, `security-threat-model`, `openai-docs` |
| Apps SDK/MCP | `openai-docs`, `mcp-apps`, `security-best-practices` |
| NVIDIA/Nemotron | `nvidia-skill-finder`, `nemotron-customize`, `nemotron-policy-generator` when policy generation is needed |
| NemoClaw/OpenShell | `nemoclaw-user-guide`, current NVIDIA primary documentation |
| Bunny | `bunny-cli`/Bunny skill and official Bunny documentation |
| Passkeys | `security-best-practices`, current `@simplewebauthn/server` documentation and installed types |

Before editing `convex/`, read `convex/_generated/ai/guidelines.md` and verify installed package versions. Never write an unfamiliar Convex API from memory.

## Global rules

- No mocks, stubs, fake responses, placeholder success paths, synthetic provider success, or silent degradation in production code.
- Test adapters may exist only in dedicated test folders or dependency injection seams; they cannot be selected by production configuration.
- A dependency outage returns an explicit failure unless a real, configured, schema-compatible fallback succeeds.
- **Production provider fallback is a first-class runtime requirement.** For every provider-backed capability requiring continuity, define the primary, ordered fallback providers, fallback-eligible failures, prohibited fallback conditions, retry/reconciliation rules, and the application state when the chain is exhausted. Fallback runs automatically inside the normal production path; it must perform the real capability and adapt provider-specific formats at the provider boundary.
- Fallback is permitted for provider outage, unavailable endpoint, timeout, rate limiting, bounded retry exhaustion, or invalid/unusable provider response. Fallback must not bypass authorization, authentication failure, safety/policy denial, invalid input, missing confirmation, merchant rejection, payment rejection, business-rule rejection, or another intentional prohibition.
- If all permitted providers fail, synchronous work ends unsuccessful with a structured feature failure; asynchronous work records durable failure, follows bounded retry policy, and reaches terminal failure when exhausted; uncertain external outcomes enter `verification_pending` until authoritative reconciliation. Never search indefinitely or fabricate success/failure.
- Before switching providers, retrying, or repeating a consequential operation, determine whether the prior attempt may have executed. Use durable idempotency and authoritative reconciliation to prevent duplicate payment, purchase, order, mutation, or generated-asset effects.
- Provider telemetry is operational evidence only; it never substitutes for durable application state. Record primary failure, fallback activation/selection/success/failure, retries, exhaustion, ambiguous outcomes, reconciliation, final state, latency, and health.
- Do not mark a provider result safe, approved, completed, staged, queued, or configured unless the responsible provider or durable state transition actually established that fact.
- Never catch an error and return success, empty data, a fabricated URL, or a fabricated receipt.
- Never trust client-supplied UID, price, availability, inventory, payment state, confirmation state, safety state, or authorization fields.
- Every user-scoped Convex function derives identity from authenticated server-side identity rather than client-supplied ownership fields. Ownership lookups use an appropriate index instead of collection scans or post-query filtering. A known document-ID lookup may skip an unnecessary ownership-index query, but must still verify the authenticated caller owns or may access the document.
- No unbounded `.collect()`, query `.filter()` in place of indexes, unbounded document arrays, or client-direct database writes.
- No permanent dual writes. Use expand, snapshot/backfill, reconciliation, final delta, cutover, observation, then contract.
- External calls run in actions, not retryable Convex mutation bodies. State changes use compare-and-set mutations.
- Do not store media bytes in Convex. Store Bunny media keys, ownership, hashes, and bounded metadata.
- Do not claim realized cost savings without provider usage evidence.

---

# Todo phases

## Phase 0 — Preflight, recovery, and evidence ledger

**Status:** Not started.

**Goal:** Establish a clean implementation baseline and prevent work from being repeated or applied to the wrong deployment.

- [ ] Confirm repository root, branch, clean/dirty state, existing user changes, and unrelated untracked skill imports.
- [ ] Read this plan and every child plan before implementation.
- [ ] Read `AGENTS.md`, `CLAUDE.md`, `agents.md`, and repository architecture docs.
- [ ] Run `npx convex ai-files install` if the generated guidelines are missing; read `convex/_generated/ai/guidelines.md`.
- [ ] Pin installed versions for Convex, `@convex-dev/agent`, rate limiter, Bunny SDK, SimpleWebAuthn, MCP SDK, and NVIDIA-related packages.
- [ ] Identify the local/dev/preview/prod Convex deployment using `convex-deploy-guard`; do not mutate production.
- [ ] Create a recovery ledger recording source plan, task, files, RED evidence, GREEN evidence, deployment target, and rollback path.
- [ ] Record the existing high-risk `callFirebaseFunction`/Firebase callable blast radius with GitNexus before editing.

**Exit gate:** Evidence ledger exists; deployment target is known; no production mutation has occurred; unrelated changes are excluded from scope.

## Phase 1 — Remove fake success and silent degradation

**Status:** Partial; audit identified defects.

**Primary defects to correct:**

- `functions/src/ai/mediaGeneration.ts` adds `safety: "approved"` after provider output. This is fabricated and must be removed.
- `services/openclaw/tools/discovery.ts` defaults to an executor that returns `{ status: "staged" }`. This is fabricated and must be removed.
- `services/guardrails/main.py` returns `Decision(True)` when NeMo is absent unless an environment flag is enabled. Production must fail closed, not allow silently.
- `functions/src/ai/providers/firestoreMediaJobStore.ts` creates a new Firestore production owner contrary to the Convex-only decision.
- `scripts/test/nvidia-agent-stack-smoke.mjs` uses TypeScript type-only imports in `.mjs` and is not a valid smoke gate.
- Any catch path returning `success: true`, `queued: true`, `completed`, `staged`, `allowed`, or an empty successful result without authoritative evidence must be classified and corrected.

- [ ] Run GitNexus impact for every listed symbol before edits.
- [ ] Write failing production-equivalent tests for primary provider success, provider failure, fallback success, fallback failure, timeout/retry, invalid provider result, safety denial, and partial persistence failure.
- [ ] Change media adapters to return a provider-owned safety/provenance decision or fail. Do not manufacture safety metadata in the adapter.
- [ ] Make OpenClaw cart preparation require a real injected production executor; missing executor fails explicitly. Return `staged` only after the real Convex cart-intent mutation succeeds.
- [ ] Make NeMo Guardrails startup/runtime fail closed when the service is unavailable or uninitialized. Deterministic structural checks may deny locally but may not silently replace configured NeMo policy with allow.
- [ ] Freeze legacy Firestore media-job expansion: no new Firestore media-job ownership, workflow, or writes. Existing Firestore media-job state may remain temporarily readable only where required to preserve the currently functioning application or perform migration.
- [ ] Implement the replacement Convex job-state model and production execution path before removing the active Firestore implementation.
- [ ] Cut callers over to Convex, reconcile existing Firestore job state, verify Convex is the active owner, and only then remove Firestore production wiring. Sequence: freeze legacy expansion → implement Convex replacement → migrate state → cut over callers → reconcile → remove Firestore implementation.
- [ ] Repair the smoke suite as valid JavaScript and ensure it exercises real failure states, not only injected success.
- [ ] Add static detection for synthetic success strings and fabricated provider metadata in active production paths.

**Exit gate:** No active production path fabricates provider, safety, checkout, staging, completion, or authorization success. Failure is explicit and user-safe. Firestore media-job state has not been expanded, and its removal is blocked until the Convex replacement and cutover gates pass.

## Phase 2 — Ownership guardrails and Google runtime retirement preparation

**Status:** Partial; dependencies and active callers remain.

- [ ] Reconcile `contracts/backend-ownership.json` with the Convex-only decision. Remove stale `neon` owners from active ownership documents.
- [ ] Add/repair ownership verification so each domain has exactly one active owner and legacy owners are explicitly marked rollback-only.
- [ ] Verify remote Google/Terraform state read-only before deleting Terraform resources. Do not treat local empty state as proof.
- [ ] Establish and verify the replacement production observability path before removing Firestore logging. Preserve structured event reporting, severity, redaction, release information, correlation IDs, provider/fallback events, ambiguous outcomes, reconciliation, and operational failure visibility. Application correctness and workflow state must not depend on telemetry availability.
- [ ] Run a production-equivalent telemetry delivery test: replacement sink success, sink outage, retry/backpressure, redaction, and recovery. Sink outage must not turn a feature failure into success or block the protected workflow indefinitely.
- [ ] After active production telemetry is reaching the replacement observability path and the observation gate passes, remove Firestore as the logging-state destination while preserving logger signatures and user-safe behavior.
- [ ] Add a no-fixed-Google-runtime guard that rejects active Spanner, VPC connector, always-warm Cloud Run, and other retired fixed-cost declarations after state proof.
- [ ] Inventory every remaining Firebase Functions, Firestore, Pub/Sub, Data Connect, Spanner, Genkit, Storage, and Hosting caller.
- [ ] Classify each caller as `identity-retained`, `migration-transport`, `rollback-only`, `target-cutover-ready`, or `unowned`.
- [ ] Do not remove Firebase Auth, Firebase ID-token issuance, authorized domains, or identity configuration.

**Exit gate:** Ownership map is executable; no accidental duplicate owner; Google resources are not deleted without evidence; Firebase Auth remains intact.

## Phase 3 — Convex identity, schema, and reactive state

**Status:** Foundation exists; migration is incomplete.

**Child plans:** `2026-09-05-convex-live-state-ai-migration.md` Tasks 1–3 and `2026-09-09-production-convex-apps-sdk-transition.md` Tasks 1–3.

- [ ] Verify `convex/auth.config.ts` against Firebase OIDC issuer, audience, RS256, and JWKS discovery.
- [ ] Verify `requireFirebaseIdentity` pins issuer and derives Firebase UID/token identifier server-side.
- [ ] Review every public Convex function for args validators, return validators, ownership checks, index use, bounded reads, and no client UID authority.
- [ ] Rehearse schema changes using the required optional-field/backfill/tighten workflow.
- [ ] Export source snapshots for each Firebase-owned domain before migration.
- [ ] Implement bounded Convex tables/functions for preferences, saved products, cart items, wardrobe items, users, and the required media/AI job state.
- [ ] Freeze expansion of existing Firestore media-job ownership. Existing jobs may remain readable only for compatibility and migration; no new permanent Firestore workflow writes are allowed.
- [ ] Add positive and negative `convex-test` coverage for owner, other-user, and unauthenticated callers.
- [ ] Create canonical export/reconciliation tools reporting counts, duplicate keys, invalid rows, lifecycle states, and SHA-256 hashes.
- [ ] Define per-domain cutover states: `legacy`, `shadow-read-verify`, `target-read`, `legacy-write-freeze`, `final-delta`, `target`, `rollback`.
- [ ] For media jobs specifically, execute: freeze legacy expansion → implement Convex replacement → migrate existing state → cut over callers → reconcile counts/hashes/statuses → verify Convex active owner → remove Firestore production wiring.
- [ ] Move one low-risk domain first and measure p50/p95/read bytes/write counts before proceeding.
- [ ] Remove array-style wardrobe rewrites and use granular Convex mutations.

**Exit gate:** Each migrated domain has one Convex owner, zero invalid reconciliation rows, negative authorization tests, rollback evidence, and a documented observation window. Media-job cutover has a functioning Convex execution path before any Firestore implementation is removed.

## Phase 4 — Convex Agent, AI state, budgets, and workflows

**Status:** Partial; Convex AI exists, legacy Firebase/Genkit AI remains active.

**Child plan:** `2026-09-05-convex-live-state-ai-migration.md` Task 4.

- [ ] Move new AI threads/messages/stream state to Convex Agent components.
- [ ] Implement Convex durable AI/media job states before removing active Firestore job readers or writers. Support `queued`, `running`, `processing`, `retrying`, `completed`, `failed`, and `verification_pending` only when established by durable state and provider evidence.
- [ ] Bound context windows and persist bounded summaries for older turns.
- [ ] Enforce per-user rate limits, global provider-dollar ceilings, and pre-provider budget rejection.
- [ ] Record raw token usage by user, provider, model, feature, thread, and request ID without prompts or PII.
- [ ] Implement single-flight cache states `pending`, `ready`, and `failed` with lease expiry and owner request ID.
- [ ] Test concurrent identical misses and prove one provider call.
- [ ] Add provider-neutral error contracts; no Gemini/Genkit-specific user-facing claims.
- [ ] Switch callers by domain and retain Firebase/Genkit only as rollback transport during observation.
- [ ] Delete legacy AI state, Pub/Sub AI queues, and Genkit runtime only after cutover evidence.

**Exit gate:** Convex owns AI state and budgets; outage, timeout, retry, and concurrent-cache behavior are tested; no silent provider fallback remains.

## Phase 5 — Commerce, passkeys, and RevenueCat

**Status:** Checkout foundation exists; passkey and entitlement work incomplete.

**Child plan:** `2026-09-08-convex-commerce-passkey-revenuecat.md`.

- [ ] Prove idempotent checkout acquisition by `(tokenIdentifier, idempotencyKey)` under concurrency.
- [ ] Keep merchant quote and Stripe calls in Node actions outside mutations.
- [ ] Never accept client amount, currency, availability, inventory, payment credentials, or order completion.
- [ ] Stop checkout at `AWAITING_STEP_UP` until trusted UI confirms the exact fresh quote.
- [ ] Implement signed Stripe webhook verification before data access, idempotent inbox, CAS state transitions, and one order receipt.
- [ ] Implement server-verified WebAuthn registration/assertion using current SimpleWebAuthn types.
- [ ] Bind one-time five-minute grants to Firebase UID, purpose, resource, amount, currency, and expiry.
- [ ] Consume the grant in the same mutation that advances the protected action.
- [ ] Reject wrong user, wrong origin, wrong RP ID, wrong purpose/resource, replay, expiry, revoked credential, and amount/currency mismatch.
- [ ] Implement RevenueCat webhook authorization before data access and idempotent grant/revoke events.
- [ ] Ensure entitlement reads are owner-scoped and clients never treat SDK-local state as authoritative.

**Exit gate:** Payment and entitlement state changes only through verified external evidence; passkey replay and cross-user tests pass.

## Phase 6 — Bunny media and static delivery

**Status:** Boundary exists; production cutover incomplete.

**Child plan:** `2026-09-05-bunny-media-cutover-finops.md`.

- [ ] Verify Bunny SDK/API version and signed URL algorithm against current official docs.
- [ ] Keep Bunny credentials server-only and fail closed when missing.
- [ ] Use content-addressed media keys, owner isolation, MIME/size validation, checksums, bounded fetch timeouts, and cleanup on partial upload failure.
- [ ] Store only stable media keys, ownership, hashes, MIME type, byte length, and lifecycle metadata in Convex.
- [ ] Route generated media through Bunny; keep onboarding avatar migration separate until reconciled.
- [ ] Rehearse export/import/retry/checksum mismatch/orphan handling without production cutover.
- [ ] Do not delete Firebase Storage bytes until the retention and rollback window passes.
- [ ] Split static hosting only after all authenticated `/api/**` consumers use an explicit API origin.
- [ ] Test deep links, cache headers, CSP, CORS, signed expiry, private no-store behavior, and rollback.

**Exit gate:** Real media bytes are reconciled; Bunny is authoritative for the migrated media domain; no Firebase media fallback is active in production.

## Phase 7 — ChatGPT Apps SDK and MCP discovery

**Status:** Read-only MCP surface exists; deployment/auth/provider contract incomplete.

**Child plans:** `2026-09-08-chatgpt-apps-sdk-surface.md` and `2026-09-09-production-convex-apps-sdk-transition.md` Tasks 4 and 7.

- [ ] Keep MCP stateless and read-only until OAuth subject mapping is implemented.
- [ ] Verify Apps SDK/MCP endpoints and package APIs through current OpenAI documentation.
- [ ] Expose only closed-world `search_products` and widget tools.
- [ ] Require explicit HTTPS discovery-provider endpoint and server-only token; fail closed if absent.
- [ ] Never invent a Convex HTTP route or internal service key.
- [ ] Validate listing URLs, freshness, source/provider identity, and bounded result count.
- [ ] Treat merchant, discovery-provider, browser, and retrieved web content as untrusted external data. Keep it separate from privileged system and tool-control instructions. External content must never gain instruction, authorization, policy, confirmation, or tool-selection authority merely because it appears in retrieved text. Validate structured values at the application boundary, restrict tools/actions server-side, and derive authorization independently of retrieved content and model output. Sanitization is defense-in-depth, not the security boundary.
- [ ] Add rate limits, audit events, origin policy, and production-equivalent MCP Inspector checks.
- [ ] Do not expose cart, checkout, account, wallet, camera, Lens, or wardrobe tools before OAuth and trusted confirmation contracts pass.

**Exit gate:** MCP has a verified HTTPS host, real provider adapter, bounded read-only tools, no fabricated listings, and explicit outage behavior.

## Phase 8 — NVIDIA Agent Stack, Convex-native adaptation

**Status:** Existing NVIDIA plan and partial code are present; several paths are incorrect or unconnected. Execute only after the Convex identity and boundary contracts are stable.

**Original child plan:** `2026-09-09-nvidia-agent-stack-integration.md`.

### N1 — Infisical KYZO provider secret contract

- [ ] Verify Infisical KYZO project/environment/path and deployment injection mechanism from runtime configuration without printing secret values.
- [ ] Keep `NVIDIA_API_KEY`, optional media/provider keys, and guardrails credentials server-only.
- [ ] Move the runtime contract to the actual Convex action/runtime boundary where the provider is executed; Firebase Secret Manager bindings may remain only for rollback Functions.
- [ ] Require NVIDIA credentials for Nemotron; report presence booleans only; redact configuration errors.
- [ ] Test missing credentials, wrong project/path, redacted errors, and no secret leakage in bundles/logs.

### N2 — Typed Nemotron intent gateway

- [ ] Verify current NVIDIA NIM/OpenAI-compatible protocol and configured deployment model through primary NVIDIA documentation and runtime configuration.
- [ ] Do not hardcode an endpoint or model ID without verification. Use required `NVIDIA_NIM_BASE_URL` and `NVIDIA_NIM_MODEL` configuration.
- [ ] Define strict `IntentPlan` output validation with confidence bounds and no authorization fields.
- [ ] Treat model output as advisory. Derive authorization, identity, confirmation, payment, and tool permissions server-side.
- [ ] Route only multimodal/strong-reasoning requests to Nemotron; use a real validated fallback only when configured and schema-compatible.
- [ ] Test each intent, malformed JSON, invalid schema, timeout, provider outage, retry bounds, fallback success, fallback failure, and prompt injection.

### N3 — Provider-neutral media gateway

- [ ] Replace any adapter that manufactures `safety: "approved"` with provider-owned safety evidence or explicit failure.
- [ ] Use Convex job documents for status/idempotency and Convex Node actions for external provider calls.
- [ ] Use Bunny for completed bytes; never store media bytes or provider URLs as the durable owner in Convex.
- [ ] Verify each provider endpoint/model before configuration. No fake NVIDIA video provider.
- [ ] Preserve virtual try-on limits, HTTPS source allowlists, content validation, checksum, ownership, and cleanup.
- [ ] Test primary provider, real fallback provider, outage, timeout, bounded retry, invalid URL/type, unsafe output, duplicate submission, partial upload, and recovery.

### N4 — Fail-closed NeMo Guardrails

- [ ] Verify current IORails flow names and runtime API from NVIDIA primary documentation and installed package types.
- [ ] Make missing, uninitialized, timed-out, malformed, or unavailable guardrails deny with a typed service error.
- [ ] Keep deterministic schema checks as defense-in-depth, not as an allow bypass for unavailable NeMo.
- [ ] Validate input, jailbreak, topic, PII, tool-call, tool-result, and output decisions.
- [ ] Test unknown tools, invalid arguments, invalid result linkage, service error, timeout, malformed response, and policy denial.

### N5 — Authenticated Convex orchestration boundary

- [ ] Implement orchestration around Firebase-authenticated Convex identity and Convex Agent state.
- [ ] Order checks: identity -> input guardrails -> budget -> classification -> strict plan validation -> tool guardrails -> confirmation -> tool execution -> result validation -> durable state.
- [ ] Store confirmations as server-owned, expiring, single-use Convex documents bound to UID and correlation ID.
- [ ] Allow discovery/read/prepare tools only; deny payment, wallet signing, credential entry, inventory mutation, arbitrary shell, and security mutation.
- [ ] Ensure no model response can directly invoke Stripe, merchant purchase, wallet signing, or shell execution.
- [ ] Test unauthenticated request, plan tampering, replay, expiry, wrong UID, wrong correlation ID, denied tool, provider outage, and user-safe error.

### N6 — NemoClaw/OpenShell sandbox policy

- [ ] Verify current policy schema and installation state against current NVIDIA NemoClaw/OpenShell docs.
- [ ] Deny unrestricted raw network access by default; permit only the declared workspace and approved application capabilities.
- [ ] Expose general public-web/deep-web research through an explicitly controlled browser or research capability that can retrieve arbitrary public HTTPS resources while enforcing production network and content boundaries.
- [ ] Prohibit direct sandbox egress to private networks, loopback, cloud metadata endpoints, internal infrastructure, undeclared service APIs, and other non-public destinations. Provider APIs and internal application services use explicit destinations and credentials, not unrestricted sandbox networking.
- [ ] Treat retrieved web content as untrusted input; it cannot expand sandbox permissions.
- [ ] Bind short-lived credentials through the deployment secret mechanism; never embed values in YAML.
- [ ] Expose research, discovery, page retrieval, comparison, and cart preparation only.
- [ ] Exclude payment submission, credentials, wallet signing, account/security mutation, and arbitrary shell execution.
- [ ] Test denied filesystem writes, denied hosts, approved endpoints, secret redaction, resource limits, and policy drift.

### N7 — OpenClaw/MCP safe commerce tools

- [ ] Use the verified stateless MCP `/mcp` surface and separate MCP host; do not expose a local stdio server as ChatGPT deployment.
- [ ] Make discovery search fail closed when the real catalog/provider adapter is unconfigured or unavailable.
- [ ] Make browser/research reads support approved public HTTPS retrieval, with bounded downloads, content and response-size controls, SSRF protections, private-network/metadata blocking, and application-controlled tool boundaries. Treat retrieved content as untrusted data; sanitization is additional defense-in-depth, not the authorization boundary.
- [ ] Remove any default executor that fabricates `{ status: "staged" }`; require a real Convex cart-intent mutation and durable result.
- [ ] Require trusted UI confirmation for consequential actions; bind token to UID, correlation ID, action, quote, and expiry.
- [ ] Validate tool results against the originating tool call and correlation ID.
- [ ] Test no final purchase tool, domain allowlisting, bounded downloads, hostile page content, confirmation replay, outage, and malformed result.

### N8 — NVIDIA rollout and verification

- [ ] Add shadow-mode Nemotron configuration for comparison and telemetry only. Shadow evaluation must never authorize or bypass protected execution.
- [ ] Enforce Guardrails before every protected capability executes. If the primary guardrail provider is unavailable, use a configured fallback only when it independently enforces the required policy boundary; otherwise stop the operation. Provider unavailability must never become allow.
- [ ] Add redacted structured events for provider health, guardrail decisions, sandbox denials, budgets, retries, confirmations, and migration ownership.
- [ ] Repair and run the NVIDIA smoke suite as valid JavaScript; include safe answer, multimodal intent, provider outage, media failure, denied tool, approved browse, confirmation replay, checkout preparation, and blocked purchase submission.
- [ ] Run TypeScript, Python, Convex, MCP, bundle, ownership, no-fake-success, and production-hardcoding gates.
- [ ] Run GitNexus `detect-changes --scope all` before each scoped commit.

**Exit gate:** NVIDIA features are provider-neutral, Convex-native, fail-closed, human-controlled, and backed by verified provider protocols. No Firestore job owner, fake safety approval, fabricated staging result, or autonomous purchase remains.

## Phase 9 — Domain-by-domain legacy retirement

**Status:** Not started.

- [ ] Create machine-readable provider-retirement records with owner, target owner, source freeze, final delta, count/hash proof, observation deadline, rollback deadline, deletion approval, and evidence.
- [ ] Retire the Firestore logging destination only after replacement observability is live, verified, and observed.
- [ ] Retire the no-op Pub/Sub pipeline only after its active callers are migrated or removed and no required media/AI workflow depends on it.
- [ ] Retire migrated personal-state Firestore/Functions callers after Convex observation.
- [ ] Retire Firestore media-job wiring only after Convex job execution is active, existing state is reconciled, callers are cut over, and the rollback window passes.
- [ ] Retire Data Connect and generated runtime clients after caller migration.
- [ ] Retire Spanner/Cloud SQL/PGAdapter and Terraform only after remote state proof and owner approval.
- [ ] Retire Firebase Storage only after Bunny reconciliation and retention window.
- [ ] Retire Firebase Hosting only after static-hosting/API-origin smoke and rollback pass.
- [ ] Retire remaining Firebase Functions only after every indexed and text-searched caller is on a verified target gateway.
- [ ] Keep Firebase Auth and identity-related client code.
- [ ] Run provider-retirement verifier and fail on duplicate active owners or retired-provider imports.

**Exit gate:** Every retired provider has reconciliation evidence and no active production caller. Remote deletion remains separately approved.

## Phase 10 — Full production-equivalent verification

**Status:** Not started.

- [ ] Primary path: authenticated Convex read/write, Convex Agent stream, real discovery adapter, Bunny media, checkout preparation, WebAuthn step-up, signed webhook, RevenueCat entitlement.
- [ ] Production state ownership path: confirm no new Firestore media-job writes occur during migration; confirm existing Firestore job state remains readable only where compatibility requires it; confirm Convex becomes active owner before Firestore removal.
- [ ] **Production fallback path:** Exercise each defined primary failure condition and verify automatic transition to the designated real fallback through the normal production processing path. A fallback result becomes successful application state only after the fallback genuinely completes the capability and the required application state is durably established.
- [ ] Verify primary success, primary failure followed by fallback success, and exhaustion of all permitted providers. Exhaustion must produce the defined failure, retry, or verification state; no fabricated response, placeholder provider, empty successful result, silent degradation, or false completion is permitted.
- [ ] For consequential external operations, prove idempotency or authoritative reconciliation before fallback/retry can execute, so an unknown preceding attempt cannot be duplicated.
- [ ] Downstream outage: provider unavailable, guardrails unavailable, Bunny unavailable, merchant unavailable, Stripe unavailable, RevenueCat unavailable, MCP adapter unavailable.
- [ ] Timeout/retry: idempotent provider calls, bounded retries, leases, stale-job recovery, no duplicate payment/order/media effects.
- [ ] Partial failure: provider succeeds but persistence fails; persistence succeeds but delivery fails; webhook duplicate; migration interrupted; orphan media.
- [ ] Migration compatibility: legacy read rollback, final delta, count/hash reconciliation, no mixed ownership after cutover.
- [ ] Recovery: retry after outage, resume migration, replay webhook, recover stale checkout/media/AI jobs, restore read path during observation window.
- [ ] Run `npm run lint`, `npm run build`, `npm run test:contracts`, `npm run test:smoke`, `npm run test:bundle-budget`, focused Convex tests, Functions tests that remain rollback-only, Python guardrail tests, MCP tests, OpenClaw tests, and KMP tests.
- [ ] Run `npx convex function-spec --prod` read-only and compare expected public/internal surface. Do not run production mutations.
- [ ] Run production health checks only against approved endpoints; do not invent routes or treat HTTP 200 health as feature verification.
- [ ] Run secret/hardcoding scans and confirm no credentials, prompts, PII, provider URLs, or model output authorization fields leak.
- [ ] Run full GitNexus detection and review HIGH/CRITICAL findings before release.

**Final release gate:** All active domains have one authoritative owner, all failures are explicit, all fallbacks are real and validated, all migrations have rollback/reconciliation evidence, Firebase Auth remains functional, and no fake-success path remains.

## Stop conditions

Stop and ask the owner before:

- deploying or mutating Convex production;
- using `npx convex run --prod`, importing/exporting production data, or changing production env;
- creating Bunny zones/pull zones/Stream libraries or changing DNS;
- deleting Firebase/Google remote resources;
- changing Firebase Auth providers or making passkeys mandatory at login;
- rotating secrets or adding secret values to files;
- enabling billing or upgrading paid tiers;
- publishing private MCP/commerce tools;
- launching GPU/NIM/Nemotron training or remote workloads;
- changing payment, wallet, merchant, or entitlement authority.

## Completion evidence required per phase

For each completed phase, record:

- child plan and task IDs;
- files changed and why;
- GitNexus impact result;
- RED test output;
- GREEN focused test output;
- package/build regression output;
- `git diff --check`;
- GitNexus detect-changes output;
- deployment target and whether deployment was skipped;
- migration counts, invalid rows, duplicate keys, hashes, and rollback evidence;
- unresolved risks and owner decisions.
