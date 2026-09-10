# NVIDIA Agent Stack Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Infisical KYZO, Nemotron Omni, NeMo Guardrails, a verified media provider, and NemoClaw/OpenClaw behind Spresso’s authenticated, human-controlled tool and checkout boundaries.

**Architecture:** Add provider-neutral server gateways for model inference, media jobs, guardrails, and sandboxed tools. Keep secrets server-side through Infisical, validate every model/tool/media result with schemas, and require trusted UI confirmation for consequential actions.

**Tech Stack:** TypeScript Cloud Functions/Run boundaries, Zod contracts, Firestore job state, Infisical runtime injection, NeMo Guardrails Python service, Nemotron serving endpoint, OpenClaw MCP tools inside NemoClaw/OpenShell.

**Spec:** `docs/superpowers/specs/2026-09-09-nvidia-agent-stack-design.md`

## Global Constraints

- Use Infisical project `KYZO`; never copy secret values into source, bundles, prompts, logs, or generated configs.
- Nemotron Omni handles multimodal understanding, intent, and planning; video synthesis remains behind a separate verified media provider.
- Guardrails fail closed on unsafe content, unknown tools, invalid arguments, malformed results, and service errors.
- OpenClaw runs only inside NemoClaw/OpenShell with deny-by-default filesystem and network policy.
- Models and agents may research, browse, and prepare checkout, but may not submit payment, enter credentials, sign transactions, or claim purchase completion.
- Preserve Firestore user state, Stripe as payment system of record, existing virtual-try-on storage, and discovery-only inventory semantics.
- No mock providers, fake success states, unverified model IDs, or autonomous purchasing.

### Task 1: Infisical KYZO runtime contract

**Files:**
- Create: `functions/src/config/providerSecrets.ts`
- Modify: `functions/src/index.ts` and the deployment configuration that binds runtime secrets
- Test: `functions/test/providerSecrets.test.ts`

**Interfaces:**
- `loadProviderSecrets(): Promise<{ nvidiaApiKey: string; geminiApiKey?: string; higgsfieldKeyId?: string; higgsfieldKeySecret?: string }>` reads server-side runtime values and throws a safe configuration error when required values are absent.
- `assertSecretPresence(): Promise<{ nvidia: boolean; mediaFallback: boolean }>` returns booleans only.

- [ ] Write tests for presence checks, missing NVIDIA credentials, and redacted error messages.
- [ ] Run `npx tsx --test functions/test/providerSecrets.test.ts` and confirm failure before implementation.
- [ ] Implement Infisical-backed resolution using the existing deployment injection mechanism; do not add secret values to `.env` or Firebase config.
- [ ] Run the test and the project’s secret-binding verification.
- [ ] Commit `feat: add KYZO provider secret contract`.

### Task 2: Typed Nemotron model gateway

**Files:**
- Create: `functions/src/ai/providers/nemotronGateway.ts`
- Create: `functions/src/ai/contracts/intentPlan.ts`
- Modify: `functions/src/ai/modelRouting.ts`
- Test: `functions/test/nemotronGateway.test.ts`

**Interfaces:**
- `classifyIntent(input: { prompt: string; imageUrls?: string[]; videoUrls?: string[]; uid: string }): Promise<IntentPlan>`.
- `IntentPlan = { intent: "answer" | "discover" | "compare" | "try_on" | "generate_media" | "prepare_tool_action"; confidence: number; rationale: string; proposedTool?: string; proposedArguments?: Record<string, unknown>; requiresConfirmation: boolean }`.

- [ ] Add tests for each intent, schema rejection, confidence bounds, and the rule that model output cannot set authorization fields.
- [ ] Run the focused test and confirm failure.
- [ ] Implement the NVIDIA endpoint adapter with a configured model ID and structured response validation; keep endpoint and model values in runtime config.
- [ ] Route only multimodal/strong-reasoning requests to the gateway; preserve existing Gemini routing as a controlled fallback.
- [ ] Run focused tests and existing model-routing tests.
- [ ] Commit `feat: add typed Nemotron intent gateway`.

### Task 3: Provider-neutral media gateway

**Files:**
- Create: `functions/src/ai/providers/mediaGateway.ts`
- Modify: `functions/src/ai/mediaGeneration.ts` and `functions/src/ai/virtualTryOnBoundary.ts`
- Test: `functions/test/mediaGateway.test.ts` and `functions/test/virtualTryOnBoundary.test.ts`

**Interfaces:**
- `submitMediaJob(input: { prompt: string; mediaType: "image" | "video"; imageUrls?: string[]; requesterUid: string; idempotencyKey: string }): Promise<{ jobId: string; provider: string; status: "queued" }>`.
- `pollMediaJob(jobId: string): Promise<{ status: "queued" | "running" | "completed" | "failed"; mediaUrl?: string; mediaType?: "image" | "video"; provider?: string }>`.

- [ ] Test provider selection, idempotency, timeout, invalid output URL/type, safety rejection, and bounded retry behavior.
- [ ] Implement the gateway around existing Gemini/Higgsfield adapters and add the verified NVIDIA video adapter only after endpoint/model documentation confirms the protocol.
- [ ] Keep virtual try-on input limits and HTTPS validation; store only job metadata and validated output references.
- [ ] Run all media and virtual-try-on tests.
- [ ] Commit `feat: isolate media providers behind job gateway`.

### Task 4: NeMo Guardrails service and policy

**Files:**
- Create: `services/guardrails/config/config.yml`
- Create: `services/guardrails/config/rails.co`
- Create: `services/guardrails/main.py`
- Create: `services/guardrails/requirements.txt`
- Create: `functions/src/ai/guardrailsClient.ts`
- Test: `services/guardrails/tests/test_tool_rails.py` and `functions/test/guardrailsClient.test.ts`

**Interfaces:**
- `validateInput(request: GuardrailsRequest): Promise<GuardrailsDecision>`.
- `validateToolCall(call: ToolCall): Promise<GuardrailsDecision>`.
- `validateToolResult(result: ToolResult): Promise<GuardrailsDecision>`.
- `GuardrailsDecision = { allowed: boolean; reason?: "content" | "jailbreak" | "topic" | "pii" | "tool" | "schema" | "service_error" }`.

- [ ] Test unsafe content, jailbreaks, topic violations, PII handling, unknown tools, invalid JSON Schema arguments, invalid result linkage, and service failure.
- [ ] Configure content, jailbreak, topic, PII, tool-call, tool-result, and output rails with exact IORails flow names.
- [ ] Make the client fail closed on timeout, malformed response, or unavailable guardrails service.
- [ ] Run Python and TypeScript focused tests.
- [ ] Commit `feat: add fail-closed Nemo Guardrails boundary`.

### Task 5: Authenticated orchestration boundary

**Files:**
- Create: `functions/src/ai/orchestration/agentOrchestrator.ts`
- Modify: `functions/src/ai/index.ts`, `functions/src/ai/flows/shopperFlow.ts`, and relevant tool registration modules
- Test: `functions/test/agentOrchestrator.test.ts`

**Interfaces:**
- `handleAgentRequest(request: { uid: string; prompt: string; media?: string[]; confirmationToken?: string; correlationId: string }): Promise<{ response: string; plan: IntentPlan; pendingConfirmation?: { action: string; summary: string } }> `.
- `authorizeAction(uid: string, plan: IntentPlan, confirmationToken?: string): Promise<"allowed" | "needs_confirmation" | "denied">`.

- [ ] Test unauthenticated requests, plan tampering, missing confirmation, replayed confirmation, tool denial, and user-safe errors.
- [ ] Compose secret loading, guardrails, Nemotron classification, tool authorization, budget limits, and idempotency in the stated order.
- [ ] Ensure no model response can directly invoke Stripe, payment credentials, wallet signing, inventory mutation, or arbitrary shell execution.
- [ ] Run focused tests plus existing shopper-flow and checkout-contract tests.
- [ ] Commit `feat: add authenticated agent orchestration boundary`.

### Task 6: NemoClaw/OpenShell OpenClaw sandbox

**Files:**
- Create: `services/openclaw/nemoclaw-blueprint/policies/openclaw-sandbox.yaml`
- Create: `services/openclaw/tool-policy.yaml`
- Create: `services/openclaw/README.md`
- Test: `services/openclaw/tests/policy.test.py`

**Interfaces:**
- Sandbox policy allows only declared egress endpoints and sandbox workspace writes.
- Tool policy exposes discovery, page retrieval, comparison, cart preparation, and status tools; no payment submission or account/security mutation tool exists.

- [ ] Verify current NemoClaw/OpenShell installation and policy syntax against primary NVIDIA documentation before writing the files.
- [ ] Test denied filesystem writes, denied network hosts, approved HTTPS endpoints, secret redaction, resource limits, and policy drift.
- [ ] Configure short-lived credential bindings from Infisical without embedding values.
- [ ] Run policy tests and a non-destructive sandbox smoke test.
- [ ] Commit `feat: define NemoClaw OpenClaw sandbox policy`.

### Task 7: OpenClaw MCP/browser contract

**Files:**
- Create: `services/openclaw/tools/discovery.ts`
- Create: `services/openclaw/tools/browser.ts`
- Modify: `mcp-server/server.mjs` and `mcp-server/README.md`
- Test: `mcp-server/server.test.mjs` and `services/openclaw/tests/tools.test.ts`

**Interfaces:**
- `searchProducts(input): Promise<DiscoveryResult>`.
- `readProductPage(input): Promise<PageSnapshot>`.
- `prepareCart(input): Promise<CartPreparation>`.
- `requestCheckoutConfirmation(input): Promise<ConfirmationRequest>`.

- [ ] Test domain allowlisting, HTTPS-only navigation, prompt-injection-resistant schemas, bounded downloads, page-content sanitization, and no final purchase tool.
- [ ] Connect tools through the authenticated orchestration boundary and Guardrails validation.
- [ ] Require a trusted UI confirmation token before any consequential action and reject tokens outside their correlation ID or expiry window.
- [ ] Run MCP and OpenClaw focused tests.
- [ ] Commit `feat: constrain OpenClaw to safe commerce tools`.

### Task 8: Rollout, observability, and verification

**Files:**
- Create: `docs/superpowers/plans/2026-09-09-nvidia-agent-stack-runbook.md`
- Modify: deployment manifests and server-side telemetry modules identified by Tasks 1–7
- Test: `scripts/test/nvidia-agent-stack-smoke.mjs`

- [ ] Add server-side structured events for provider health, guardrail decisions, sandbox denials, cost budgets, retries, and confirmation outcomes; redact prompts, PII, tokens, and credentials.
- [ ] Add shadow-mode feature configuration for Nemotron and observe-then-enforce Guardrails rollout.
- [ ] Run the smoke suite for safe answer, multimodal intent, try-on job, denied tool, approved browse, checkout preparation, and blocked purchase submission.
- [ ] Run lint, type checks, Python tests, MCP tests, and the repository’s production hardcoding boundary tests.
- [ ] Perform `gitnexus detect-changes --scope all` before any final commit and document unresolved risk.
- [ ] Commit `docs: add NVIDIA agent stack rollout runbook`.

## Handoff

Implementation must begin with Task 1 and proceed in order. Each task requires its own focused test cycle and commit. Provider model IDs, media endpoints, Infisical environment paths, OpenClaw policy presets, and GPU/runtime profiles must be verified from current primary documentation before being written as configuration.
