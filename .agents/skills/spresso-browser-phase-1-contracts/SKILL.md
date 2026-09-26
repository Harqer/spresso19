---
name: spresso-browser-phase-1-contracts
description: Audit the current Spresso browser/commerce path and establish the canonical Convex schema, state machine, execution contracts, and non-synthetic tool semantics before live browser implementation.
schedule: "Run when this bundle is installed, PHASE-1-DONE.md and PHASE-1-BLOCKED.md are absent, and the repository contains the Spresso Convex browser code."
---

# Operating rules

Read before work:
- `.agents/skills/spresso-browser-orchestrator/references/architecture-contract.md`
- `.agents/skills/spresso-browser-orchestrator/references/nested-skills.md`
- `.agents/skills/spresso-browser-orchestrator/references/repo-paths.md`
- `.agents/skills/spresso-browser-orchestrator/references/phase-markers.md`

Work against current HEAD. Search call sites before replacing exports. Preserve working canonical paths and remove duplication rather than adding a parallel subsystem.

Use repository evidence and tests. Do not ask the user for information derivable from the codebase or primary docs.

If `.noodle.toml` is `auto` and this phase explicitly forbids auto, stop without code changes and create the phase BLOCKED marker requesting `supervised` or `manual`.

# Phase 1 — canonical contracts and repository truth

## Nested skills

Load `convex:convex-reviewer` for the initial audit. Load `convex:convex-expert` before editing any `convex/` file. Re-run `convex:convex-reviewer` before completion.

## Goal

Establish one authoritative browser workflow/state contract before the runtime is replaced. This phase is allowed to change schema/state/contracts and tests, but does not implement Browserbase/Playwright execution yet.

## Audit

Read the full current implementations of:
- `convex/schema.ts`;
- all `convex/merchantBrowser/**`;
- browser tools exported through `convex/ai/tools.ts`;
- `convex/commerce/**`, `convex/payments/**`, `convex/http.ts`;
- KMP merchant-browser state consumers;
- package dependencies and existing tests.

Trace each current browser tool from AI definition -> Convex action/mutation -> provider -> event/state -> KMP consumer.

Document demonstrated defects in `docs/browser-automation/phase-1-audit.md` with file/symbol evidence. At minimum confirm or disprove:
- synthetic success in open/add/update/remove;
- Kitesurf selection for new interactive sessions;
- missing real browser executor;
- payment success creating a retailer order without merchant confirmation;
- duplicate legacy Kitesurf/OpenClaw commerce authority.

## Canonical state contract

Evolve the existing `merchantBrowserSessions` table rather than creating a second session table.

Required statuses:

```text
STARTING
ACTIVE
WAITING_USER_INPUT
WAITING_SECURE_INPUT
HANDOFF_REQUIRED
HUMAN_CONTROL
RESUMING
READY_FOR_PURCHASE_AUTHORIZATION
SUBMITTING_PURCHASE
COMPLETED
FAILED
EXPIRED
```

Required control owner:

```text
AGENT | USER | CREDENTIAL_BROKER | NONE
```

Persist provider as a Browserbase-capable enum/field without persisting CDP connect URLs or debug URLs.

Required session identity:
- owner tokenIdentifier;
- taskId;
- merchant origin/host;
- providerSessionId;
- state/controlOwner;
- lastEventSeq;
- current URL/title/step;
- action budget if retained;
- created/updated/expires timestamps.

Use optional-field schema evolution if current rows exist. Add indexes required by every owner/status/task read path.

Keep `merchantBrowserEvents` append-only and customer-safe.

## Execution contract types

Define shared TypeScript contracts for:
- `BrowserExecutionRequest`;
- typed `BrowserOperation`;
- locator target;
- `BrowserAssertion`;
- compact `BrowserExecutionResult`;
- `OUTCOME_UNKNOWN` for timed-out state-changing actions.

Operations must cover the complete browser surface required by the architecture reference, including `evaluate` and a trusted-broker `cdp` escape operation.

Do not implement cached merchant workflows.

## Tool semantics

Change browser-tool contracts so a tool cannot return a success boolean merely because an event was recorded. A state-changing tool's success contract requires verified browser evidence in Phase 2.

Keep API compatibility where feasible; if an existing return shape is unsafe, update its call sites atomically and test it.

## Tests

Add/adjust Convex tests for:
- owner scoping;
- legal/illegal state transitions;
- exactly-one control owner;
- monotonic event sequence;
- stale expected sequence rejection;
- action budget behavior if retained;
- terminal-state immutability;
- timeout/unknown outcome representation;
- no provider credential fields in public/session/event payloads.

## Completion gates

Run repository TypeScript/Convex tests relevant to touched files and the existing smoke/no-synthetic-success checks.

Write `docs/browser-automation/PHASE-1-DONE.md` only when:
- audit is written;
- canonical schema/state/contracts compile;
- required tests pass;
- Convex reviewer finds no unresolved critical/important defect.

Do not install Browserbase/Playwright in this phase unless a type-only contract requires it.
