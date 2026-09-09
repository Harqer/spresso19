# Prompt and Serialization Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILLS before any task: `security-best-practices` (identify all languages/frameworks; read the TypeScript server, React frontend, and general web references), `security-threat-model` (produce the repository-grounded threat model using its `references/prompt-template.md` output contract verbatim), `openai-docs` (structured-outputs and model selection). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Remove system prompts and policy text from all client-reachable surfaces, enforce serialization discipline at every LLM boundary (schema-validated structured content in and out), and write the repository-grounded threat model for the AI/MCP surface.

**Architecture:** System prompts and policy text live server-side in Convex-managed configuration, read by server functions at generation time. Clients send user intent only. Every agent/LLM boundary validates inputs with zod and returns only schema-validated structured content — model text is never an API response, and untrusted listing/merchant content is never interpolated into instructions.

**Spec:** `docs/superpowers/specs/2026-09-05-platform-cost-migration-design.md` (2026-09-08 revision)

## Global Constraints

- Never ship system prompts, tool policies, or provider/model identifiers in web or KMP bundles. Verify with a bundle-content test, not by review alone.
- Every tool input is zod-validated and closed-world. `v.literal`/enum unions for fixed sets; no raw pass-through strings that reach instructions.
- Every LLM/tool response is validated against a `structuredContent`-style output schema before use; invalid output is a typed error, never lenient parsing (zero-mock).
- Tool descriptions are injection-resistant and never contain merchant content, user content, or secrets. Treat listing text, merchant pages, and tool output as untrusted data (zero-trust agent boundary, AGENTS.md).
- Secrets never enter prompts or logs; redact before any model call or telemetry write.
- Rate/budget limits are enforced before provider invocation.
- Run GitNexus impact before symbol edits, write failing tests first, run full detect-changes before each commit.

## Tasks

### Task 1: PG-001 — System prompts server-side

**Files:**

- Create: `convex/ai/prompts.ts` (server-side prompt config storage + internal reader)
- Create: `convex/ai/prompts.test.ts`
- Modify: `functions/src/ai/prompts/shopperPrompt.prompt` → migrate content into the Convex config (keep the file as rollback-only during observation)
- Modify: AI call sites to load prompts via the internal reader

- [x] **Step 0 (done 2026-09-08):** Web surface fixed — `LiveCookingAssistantModal.tsx` no longer ships its system instruction; the model/config/system-instruction are server-owned via `liveConnectConstraints` in `generateLiveApiToken` (verified against the `gemini-live-api-dev` skill's ephemeral-token guidance).
- [ ] **Step 0b (gated):** `composeApp/src/androidMain/kotlin/com/spresso/SpressoWearablesService.kt` (lines ~294-296) embeds three wearable session system instructions (grocery scanner, bargain chef, hands-free checkout). This file is under the **Meta DAT development gate**: before moving these server-side (new per-action token minting callable + service edit), complete the DAT MCP/`mwdat-android` skill consultation and MockDeviceKit/live-inspector validation evidence required by AGENTS.md. Do not edit from memory.
- [ ] **Step 1: Impact analysis** on every prompt-loading call site (Genkit dotprompt usage, direct model calls).

- [ ] **Step 2: Failing tests** — prompt config is readable only through the internal reader with authenticated context; client-bundle scan finds no prompt/policy strings; invalid/missing config fails closed (no empty-prompt generation).

- [ ] **Step 3: Verify RED**, implement, **verify GREEN** — `npx vitest run convex/ai/prompts.test.ts`; commit `feat: move system prompts server-side to convex`.

### Task 2: PG-002 — Serialization discipline at LLM boundaries

**Files:**

- Modify: AI tool definitions (web + Functions during transition; Convex tools per the AI-001 ticket)
- Create: `test/llmBoundarySerialization.test.mjs`

- [ ] **Step 1: Failing tests** — every tool: closed-world zod input (invalid shapes rejected, not coerced), output schema rejects unexpected fields, no tool response is rendered as raw HTML/markdown in any client, tool descriptions contain no dynamic content.

- [ ] **Step 2: Verify RED**, implement validators on every boundary, **verify GREEN**; commit `feat: schema-validated llm boundaries`.

### Task 3: PG-003 — Repository threat model

**Files:**

- Create: `spresso-threat-model.md` (repo root, per the skill's naming rule)

- [ ] **Step 1:** Follow `security-threat-model` exactly: system model with evidence anchors, trust boundaries (ChatGPT host ↔ MCP server ↔ Convex ↔ Stripe/RevenueCat/Bunny; clients ↔ gateways), assets, attacker model, abuse paths (prompt injection via merchant listings, confused-deputy tools, secret exfiltration), prioritization with explicit likelihood/impact.
- [ ] **Step 2: Required check-in** — present 3–6 key assumptions and 1–3 targeted questions to the owner and wait before finalizing the report (the skill mandates the pause).
- [ ] **Step 3:** Finalize with owner answers (or explicit non-responses), quality-check against the output contract, commit `docs: repository threat model`.

## Delivery gate

Bundle-content test proves no prompts/policies client-side; every LLM boundary has schema-validated input and output; threat model completed per the skill contract. Rollback: prompt file remains as rollback-only during observation.
