# Harqer RLM Skill Router and Continual Harness Design

**Status:** Approved in conversation; pending written-spec review

**Date:** 2026-09-06

**Initial implementation target:** Harqer RLM API

**Design artifact location:** Spresso coordination repository

## Purpose

Evolve Harqer RLM API from a stateless completion proxy into a model-agnostic agent harness that keeps large, reusable context outside the model's active prompt. The first and most urgent deliverable is a reversible cleanup of globally installed skills. One small Superpowers bootstrap remains automatically visible and routes tasks to versioned skill bodies stored in a persistent library.

The system must preserve the useful Superpowers behavior: every task is checked for applicable skills before work begins. The check becomes a cheap programmatic lookup in the RLM environment instead of a scan over a large prompt-injected catalog.

## Current State

### Codex skill installation

The audited machine currently contains:

- 171 skills under `~/.agents/skills`.
- 49 skills under `~/.codex/skills`.
- 26 skills under Spresso's `.agents/skills`.
- At least 35 byte-identical duplicates between the two global directories.
- Two enabled Superpowers plugin installations containing the same version, plus a project copy.
- More than 60,000 characters of visible skill descriptions before all plugin and project instructions are counted.

Codex normally loads skill bodies progressively, but names and descriptions remain part of skill discovery. The large, overlapping catalog therefore adds persistent selection cost and conflicting instructions even when most bodies are not opened.

### Harqer RLM API

The archive at `/home/shaolin/Downloads/harqer-rlm-api.zip` is a FastAPI service over `rlms==0.1.3`. It provides direct and RLM completion modes and turns named request context into Python variables. It does not provide persistent sessions, durable kernels, a skill registry, retained subagents, agent messaging, refinement, goals, heartbeats, or autonomous continuation.

Each RLM request constructs a fresh `RLM` instance. The existing integration test uses a context far below the automatic RLM threshold and therefore exercises the direct path. The current savings calculation compares estimated baseline input tokens with actual input plus output tokens, so it cannot substantiate a like-for-like savings claim.

### Repository boundary

The Harqer implementation remains a dedicated repository. Before implementation, the archive will be restored to a writable working copy while preserving its embedded Git history; it will not become a Spresso runtime component. This document lives in Spresso only as the approved coordination artifact. Global library state under `~/.harqer` is runtime data and is not committed to Spresso.

## Goals

1. Reduce the automatically visible user skill catalog by at least 85 percent without losing installed skill content.
2. Keep one small Superpowers router automatically active so skill discipline remains universal.
3. Resolve explicit and implicit skill requests without placing the complete catalog in model context.
4. Make skills portable across Codex, OpenAI Responses, Anthropic, Gemini, local models, and future adapters.
5. Persist session context, REPL variables, subagent handles, messages, and history across turns and process restarts.
6. Allow harness prompts, skills, memories, and subagent specifications to evolve through versioned, evaluated changes.
7. Measure task quality, token use, cost, latency, and routing accuracy against reproducible baselines.

## Non-goals

- Training or modifying model weights.
- Reimplementing every feature of Prime Agent in the first release.
- Deleting archived skills or making cleanup irreversible.
- Allowing refinement to alter immutable safety, authorization, or secret-handling policy.
- Claiming benchmark or token improvements without controlled measurements.
- Making the core dependent on Codex-specific message or tool formats.
- Building a graphical agents view or full TUI before the runtime contracts are stable.

## Design Principles

### Model-agnostic core

Provider and agent products connect through adapters. The core owns sessions, context references, skill routing, budgets, event history, and policy. Adapters translate these concepts into each provider's messages, tools, streaming events, and usage records.

### Host authority and programmable REPL

The persistent REPL may inspect context and request actions. The host remains authoritative for credentials, permissions, filesystem and network boundaries, budgets, session state, subagent admission, and durable writes. Model-written code never receives unrestricted access to host secrets.

### Progressive disclosure

Only the immutable policy, current task, compact session state, and Harqer Superpowers bootstrap are placed in active context. Skill metadata is queried programmatically. Full skill instructions and references load only after routing selects them.

### Recoverable change

Skill migration, harness refinement, and session persistence are append-only or versioned. Destructive deletion is replaced with archival or tombstones. Every change records provenance, hashes, and a rollback point.

## Context Hierarchy

| Layer | Contents | Lifetime |
| --- | --- | --- |
| L0 | Model weights and provider runtime | Provider-defined |
| L1 | Immutable policy, user task, compact working state, Superpowers bootstrap | One model turn |
| L2 | Persistent REPL variables, loaded skill bodies, context handles, subagent handles | Session |
| L3 | Skill library, event log, snapshots, memories, evaluation evidence | Durable local storage |
| L4 | Optional remote artifact and coordination storage | Deployment-defined |

Compaction operates on L1. It may replace conversation text with a compact summary and durable references, but it must not destroy L2-L4 state.

## Global Skill Library

### Filesystem layout

The portable library uses the following conceptual layout:

```text
~/.harqer/
  skills/
    library/<namespace>/<skill>/<version>/
      SKILL.md
      manifest.json
      agents/
      scripts/
      references/
      assets/
    registry.sqlite
    aliases.json
  backups/<migration-id>/
  sessions/<session-id>/
  evals/
```

The version directory is the source of truth. `registry.sqlite` is a rebuildable index with full-text search; it is never the sole copy of a skill. `manifest.json` records the canonical name, source, version, content hash, capabilities, invocation policy, dependencies, trust state, and installation time.

Conflicting skills with the same name and different content remain separate versions or namespaces. Byte-identical copies collapse to one content-addressed version with source aliases.

### Lifecycle

Skill states are `quarantined`, `active`, `retired`, and `tombstoned`. New or updated external skills enter quarantine until their structure and provenance are validated. Retirement removes a version from normal routing without deleting it. A tombstone records an intentional logical deletion and keeps recovery metadata.

### Global cleanup migration

The migration is transactional and reversible:

1. Inventory discovered skills, plugins, invocation policies, sources, hashes, and name conflicts.
2. Create a timestamped recovery manifest and copy of affected configuration.
3. Import all user-installed skills into the Harqer library without changing discovery directories.
4. Build and verify the index; compare file counts and hashes with the inventory.
5. Install and smoke-test the Harqer Superpowers router.
6. Disable duplicate plugin registrations. Retain a plugin only when a required non-skill capability cannot yet be exposed through Harqer, and prevent its skills from joining automatic discovery when the host supports that separation.
7. Move migrated user skills out of Codex discovery directories. Do not modify Codex-owned `.system` skills.
8. Remove redundant project copies only after global exact and implicit routing succeeds.
9. Restart Codex and measure the discovered catalog and initial context.

If any verification fails, restore the configuration and directories from the recovery manifest. The first migration performs no permanent deletion.

## Harqer Superpowers Router

Harqer Superpowers is the sole automatically visible user-authored bootstrap. It preserves the rule that every task receives a skill applicability check, while avoiding catalog injection.

After migration, the intended automatic surface is Codex-owned system skills plus Harqer Superpowers. Third-party and user-authored skill bodies live in the Harqer library. General-purpose skills are no longer vendored into individual project skill directories.

Its model-facing contract is intentionally small:

```python
match = skills.route(task=current_task, phase=current_phase)
loaded = skills.load(match.required)
```

### Routing behavior

- Exact `/skill`, `$skill`, or adapter-equivalent invocation resolves a named skill version. Where a host cannot dynamically register those names, `$harqer-superpowers <name>` and `skills.load("<name>")` are the guaranteed forms.
- Implicit routing searches names, concise descriptions, capabilities, tags, prior successful routes, and project constraints.
- Routing returns identifiers, confidence, reasons, and dependency identifiers; it does not return every candidate body.
- The initial load normally contains at most one process skill and one domain skill.
- Additional skills may be loaded when a new phase or uncovered requirement justifies them.
- Identical versions are loaded once per session.
- Explicit user instructions override skill guidance.
- A route with no useful match permits ordinary model behavior instead of forcing an irrelevant skill.
- Required project or platform gates are represented as immutable policy or explicit project constraints, rather than relying on accidental semantic matching.

The router records candidate rankings, selected versions, overrides, task outcomes, token costs, and errors. This evidence becomes input to later refinement.

## Harness Components

### Skill service

Provides `list`, `get`, `search`, `route`, `load`, `create`, `update`, `retire`, and `restore`. Mutating operations create immutable versions. The service validates manifests, paths, provenance, and dependencies before activation.

### Session service

Creates and resumes sessions. Each session owns a durable event stream, current leaf, compact working summary, kernel reference, loaded skill set, context variables, budget, and child-agent registry.

### Kernel manager

Starts, resumes, snapshots, and disposes isolated REPL kernels. A kernel receives scoped context handles and a narrow host bridge. Long content remains addressable by identifier and may be sliced or searched without entering the model prompt.

### Provider adapters

Each provider adapter implements the same completion, streaming, tool-call, usage, cancellation, and error contract. Provider-specific model IDs, envelopes, and authentication remain inside the adapter. Harqer does not describe one provider's model as interchangeable with another without adapter validation.

### Agent adapters

Agent-product adapters connect Harqer to Codex and other coding agents. The Codex adapter exposes the small Superpowers bootstrap and translates route, load, subagent, message, compaction, and usage operations into capabilities Codex actually supports. Core storage and routing do not depend on Codex.

### Subagent service

Subagents are retained sessions. `spawn` returns an admission handle immediately; answers arrive through explicit messages. The service supports `list`, `send`, `follow_up`, `interrupt`, `resume`, and status inspection. Communication is restricted to the parent, children, and siblings within one session family unless a future policy explicitly expands it.

Isolated children receive task-specific context references by default. Full conversation copying is opt-in because it defeats context isolation.

### Continual harness service

Harness state contains prompts, subagent specifications, skills, and memories. All four use versioned CRUD operations. Refinement follows this state machine:

```text
observation -> proposal -> evaluation -> review -> activation -> monitoring
```

The first production release requires human approval before activation. A proposal must identify its trigger, exact diff, affected routes, evaluation set, outcome, and rollback version. Immutable policy cannot be modified through this service.

### Goal and scheduler service

A goal records a concrete objective and optional token, cost, time, turn, and concurrency budgets. Heartbeats inject scheduled checks. Autonomous continuation re-enters an unfinished goal until it completes, exhausts a declared budget, hits a stop condition, or needs authority that has not been granted. Continuation never expands permissions or authorizes external side effects.

## Data and Control Flow

1. An adapter receives a user task and authenticated session reference.
2. The host assembles minimal L1 context and invokes Harqer Superpowers.
3. `skills.route` queries the local index and returns a bounded candidate decision.
4. The host validates trust, dependencies, policy, and budget before loading selected versions into L2.
5. The model reasons over the task and selected instructions. REPL operations use opaque handles to query larger L2-L4 context.
6. Tool and subagent requests cross the host bridge, which validates identity, scope, inputs, destination, budget, and replay state.
7. The host appends messages, routes, tool results, usage, errors, and state transitions to the session event log.
8. Responses stream through the adapter. Internal traces remain in operational telemetry.
9. Snapshotting records recoverable kernel and session state without replacing the append-only history.

## Persistence Model

The local-first implementation uses SQLite plus append-only JSONL:

- SQLite stores searchable metadata, relationships, active version pointers, session indexes, budgets, and evaluation summaries.
- JSONL stores ordered session and harness events.
- Content-addressed files store skill versions, snapshots, and large artifacts.

Core tables include `skills`, `skill_versions`, `skill_aliases`, `sessions`, `session_events`, `snapshots`, `agents`, `agent_messages`, `memories`, `refinements`, and `evaluation_runs`.

Storage interfaces permit PostgreSQL or managed services later, but the initial cleanup does not require provisioning a remote database.

## API Evolution

The current `POST /v1/completions` endpoint remains as a compatibility path. New session-oriented APIs are added behind versioned contracts:

- `POST /v1/sessions`
- `POST /v1/sessions/{id}/messages`
- `POST /v1/sessions/{id}/compact`
- `POST /v1/sessions/{id}/agents`
- `POST /v1/sessions/{id}/agents/{name}/messages`
- `GET /v1/sessions/{id}/events`
- `POST /v1/skills/route`
- Versioned skill and refinement CRUD endpoints

The compatibility endpoint must stop claiming measured savings until its baseline and RLM paths are tested with equivalent tasks and provider usage fields.

## Error Handling

- Provider, tool, kernel, and child-agent failures use typed internal errors and stable public error envelopes.
- Raw provider exceptions and secrets never appear in client responses.
- Timeouts and cancellations propagate to active provider calls, kernels, and child work where supported.
- Writes carry idempotency keys and use transactions or append-only event identifiers.
- Kernel crashes trigger recovery from the last valid snapshot plus later events.
- Missing or invalid skills fail closed with a precise routing error; the harness does not invent fallback instructions.
- Budget exhaustion stops new work and preserves resumable state.

## Security Boundaries

- Local in-process REPL execution is limited to a clearly marked trusted-development mode.
- Untrusted or multi-tenant execution requires an isolated kernel with filesystem, network, process, time, memory, and output limits.
- Provider credentials remain in the host and are exposed only through scoped adapter calls.
- Context, webpages, tool output, model output, and imported skills are untrusted until validated for their intended role.
- Arbitrary provider keyword arguments are replaced by per-adapter validated schemas.
- Request sizes, context-variable names, duplicate names, reserved names, iterations, recursion, spend, and concurrency are bounded.
- CORS and origins use deployment allowlists.
- API keys use hashed storage, rotation, revocation, rate limits, and atomic quota reservation.
- Skill versions record provenance and content hashes. External updates never auto-activate.

## Evaluation Strategy

### Skill cleanup acceptance

- Every pre-migration skill file is represented by an identical hash in the library or an explicit conflict record.
- Rollback restores the original directories and plugin configuration.
- After restart, automatically visible user skills are reduced to Harqer Superpowers plus approved exceptions.
- Visible skill metadata is reduced by at least 85 percent from the recorded baseline.
- Exact invocation resolves every migrated canonical name and alias.

### Routing quality

A versioned golden set contains real task prompts and expected required, optional, and forbidden skills. Measurements include top-k recall, incorrect mandatory loads, average bodies loaded, routing latency, and routing tokens. Promotion requires no regression on high-risk platform gates.

### Harness quality

Compare four controlled configurations:

1. Direct prompt with the relevant context supplied normally.
2. Existing stateless RLM completion.
3. Persistent RLM with Harqer Superpowers routing.
4. Persistent RLM with an evaluated refinement candidate.

Track task success, input and output tokens separately, provider cost, wall time, tool calls, retries, and human interventions. Model, reasoning settings, task, tool availability, and repeated-trial policy remain fixed within each comparison.

AGI or coding benchmark claims require published task definitions, scorer versions, run counts, failure accounting, and raw artifacts. A reduction in prompt tokens alone is not accepted as improved task performance.

### Reliability tests

- Unit tests cover indexing, deduplication, aliases, routing limits, budgets, and event replay.
- Contract tests cover every provider and agent adapter without transferring provider-specific assumptions.
- Integration tests force both direct and RLM paths.
- Crash tests kill workers between events and snapshots, then verify recovery.
- Security tests exercise malicious skill content, prompt injection, path traversal, SSRF, oversized requests, quota races, and secret redaction.
- Migration tests run against a copy of the current global directories and prove rollback.

## Delivery Order

### Milestone 1: urgent global skill cleanup

Build the portable library, inventory/import pipeline, derived index, Harqer Superpowers router, Codex adapter, recovery workflow, and routing evaluation set. Verify the router before moving skills out of discovery directories. Disable duplicate plugin registrations and migrate redundant project copies only after exact and implicit routing pass.

### Milestone 2: persistent context runtime

Add session IDs, append-only events, persistent isolated kernels, snapshots, context handles, compaction references, corrected usage accounting, and the session-oriented API while preserving `/v1/completions` compatibility.

### Milestone 3: persistent subagents and communication

Add retained child sessions, immediate admission handles, family-scoped messaging, follow-up turns, recovery, and explicit budgets.

### Milestone 4: continual harness

Add versioned prompt, skill, memory, and subagent CRUD; proposal generation; evaluation; human-reviewed activation; monitoring; and rollback.

### Milestone 5: autonomous evaluation

Add goals, heartbeats, continuation, benchmark runners, cost controls, and evidence-backed refinement experiments.

The implementation plan created after this specification is approved will cover Milestone 1 only. Each later milestone receives a focused design review and implementation plan after the preceding contracts are verified.

## Success Criteria

The first release is successful when a fresh Codex session sees only the small approved automatic surface, Superpowers still routes every task, all existing skills remain recoverable and exactly invocable through Harqer, duplicate bodies are not loaded, and the before/after context measurement demonstrates the targeted metadata reduction.

The broader harness is successful when the same persisted session and skill contracts work through at least two different model-provider adapters, survive worker restart, retain and resume subagents, and reject a refinement that fails its evaluation gate.

## References

- [Prime Agent announcement](https://www.primeintellect.ai/blog/prime-agent)
- [Prime Agent RLM programming model](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm.md)
- [Prime Agent skill system](https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/skills.md)
- [Recursive Language Models paper](https://arxiv.org/abs/2512.24601)
- [Continual Harness paper](https://arxiv.org/abs/2605.09998)
- [Official OpenAI model and harness guidance](https://developers.openai.com/api/docs/guides/latest-model)
