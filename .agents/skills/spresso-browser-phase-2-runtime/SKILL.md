---
name: spresso-browser-phase-2-runtime
description: Implement the production Browserbase plus Playwright runtime, real general browser operations, postcondition verification, batching, and per-merchant session concurrency.
schedule: "Run only after PHASE-1-DONE.md exists and PHASE-2-DONE.md and PHASE-2-BLOCKED.md are absent."
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

# Phase 2 — Browserbase + Playwright live runtime

## Nested skills

Load `convex:convex-expert` before Convex edits and `convex:convex-reviewer` before completion.

If `.agents/skills/playwright-cli/SKILL.md` exists, consult it for locator/waiting/testing guidance. Production remains `playwright-core`.

If a Browserbase `browserbase-cli` skill exists, use it only for platform/session inspection; use the SDK in production code.

## Goal

Replace the current non-interactive/Kitesurf provider path with real full-Chromium Browserbase sessions controlled by Playwright, while preserving Convex as workflow authority.

## Dependencies

Add compatible current versions of:

```text
@browserbasehq/sdk
playwright-core
```

Do not install a local Chromium binary for production execution.

Require deployment env vars:

```text
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID   # when required by current SDK/account
```

Never expose them to clients.

## Provider implementation

Refactor the canonical `convex/merchantBrowser/provider.ts` path rather than creating a second provider subsystem.

Create Browserbase session:
- `browserSettings.verified = true`;
- CAPTCHA auto-solving disabled because takeover is explicit;
- no persistent Browserbase Context;
- session timeout bounded to the workflow TTL;
- attach task/session metadata if supported.

Persist only `providerSessionId`.

For each execution action:
1. authenticate/authorize owner through the existing Convex boundary;
2. load the session and validate state/controlOwner;
3. `bb.sessions.retrieve(providerSessionId)`;
4. require status RUNNING and a `connectUrl`;
5. `chromium.connectOverCDP(connectUrl)`;
6. use the remote default context/page;
7. install the Phase-2 non-security observation hooks required for postconditions;
8. execute the entire typed operation batch;
9. verify every declared assertion;
10. return bounded structured evidence;
11. disconnect the Playwright client without deliberately destroying the Browserbase session.

At workflow completion/expiry/failure cleanup, explicitly release the Browserbase session.

`connectUrl` and debug URLs are sensitive ephemeral values. Never store them in Convex tables/events/log summaries.

## Real operations

Implement the full operation set from Phase 1, including:
- semantic locators with frame scoping;
- navigation/back/forward;
- click/dblclick;
- fill/type/select/check;
- keyboard/mouse/scroll/hover/drag;
- waits and waiter-before-trigger patterns;
- tabs/popups;
- uploads/downloads;
- inspect/accessibility/DOM;
- screenshot;
- `page.evaluate`;
- brokered CDP operation.

CDP broker must reject administrative methods that disable Spresso enforcement hooks or expose Browserbase transport credentials. Normal site/browser capability remains available.

## Remediate synthetic tools

`merchant_open_product`, `merchant_add_to_cart`, `merchant_update_quantity`, and `merchant_remove_item` must perform real browser operations and verify postconditions.

Examples:
- open product -> final merchant URL/product identity evidence;
- add cart -> expected product/variant/quantity in merchant cart;
- update quantity -> exact new quantity;
- remove -> expected item absent.

No `{added:true}` / `{updated:true}` result without browser proof.

## Batching

One AI tool invocation may carry a coherent operation batch. Keep dependent actions in one Playwright connection/turn.

Return:
- final URL/title;
- requested extracted fields;
- assertion results;
- bounded state diff/evidence;
- resulting event sequence;
- artifact references, not unbounded binary/text dumps.

## Multi-store concurrency

One merchant = one Browserbase session. Add a bounded fan-out path for independent merchants. Do not share page/context/session state across stores.

Keep live candidate sessions until a bounded continuation TTL, then release unselected sessions.

## Failure semantics

For read-only operation failures: fail with typed reason.

For timeout/disconnect after a state-changing operation:
- return `OUTCOME_UNKNOWN`;
- re-observe before any retry;
- never blindly replay add-to-cart, submit, or other non-idempotent actions.

## Tests

Add unit/integration tests for:
- provider session create/retrieve/release;
- reconnect to existing session;
- real operation serialization;
- postcondition enforcement;
- frame/tab/popup handling;
- timeout -> OUTCOME_UNKNOWN;
- no synthetic success;
- parallel sessions remain isolated by IDs/owners;
- connect/debug URLs never appear in public state/events.

Run at least one controlled real Browserbase integration flow that navigates, fills, clicks, and verifies resulting state.

## Completion

Write `PHASE-2-DONE.md` only when real Browserbase Chromium drives the previously synthetic tools and all Phase-2 tests/gates pass.
