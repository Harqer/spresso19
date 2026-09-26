# Phase 2 blocked — live Browserbase verification requires platform credentials

This marker documents ONE blocked gate only. The full Phase 2 implementation is
shipped, typechecked, and tested (see below); the blocked item is the
credential-gated real-Browserbase verification flow.

## Exact failing requirement

`PHASE-2-DONE.md` requires: "real Browserbase Chromium drives the previously
synthetic tools and all Phase-2 tests/gates pass", including "run at least one
controlled real Browserbase integration flow that navigates, fills, clicks, and
verifies resulting state."

## Exact failing command/API/permission

- API: Browserbase Sessions API (`bb.sessions.create` / `bb.sessions.retrieve`)
- Env: `BROWSERBASE_API_KEY` (and optionally `BROWSERBASE_PROJECT_ID`)
- Failure: the variable is not set in this environment (`env | grep -i
  browserbase` returns nothing). `convex/merchantBrowser/browserbase.ts` fails
  closed with "missing BROWSERBASE_API_KEY" rather than calling the platform.

## Evidence

- `grep -rn BROWSERBASE_API_KEY convex/` shows the only reads are inside
  `browserbase.ts`, which throws when the key is absent — by design, no
  synthetic session is ever created.
- No credential exists anywhere in the repo (checked; not committed, not in
  `.env.local` which is unreadable/unauthorized in this workspace).

## Why code changes cannot resolve this

A real remote Browserbase session requires an account-scoped API key issued by
the Browserbase platform. This is an external credential/permission, not an
implementation gap. Fabricating a key or stubbing the check to claim DONE would
violate the no-synthetic-success contract.

## What HAS been delivered (verification, all green)

- Dependencies: `@browserbasehq/sdk@^2.21.0`, `playwright-core@^1.63.0`
  (no Chromium download; no local browser binary installed for production).
- `convex/merchantBrowser/browserbase.ts` — create/retrieve/release/debug
  transport: verified Chromium, CAPTCHA auto-solve disabled, no persistent
  Context, timeout bounded to workflow TTL, hashed metadata only, connectUrl
  in memory per action, REQUEST_RELEASE at workflow end.
- `convex/merchantBrowser/executor.ts` — real Playwright batch executor: the
  full typed operation surface (semantic locators, frames, tabs/popups,
  uploads guarded to broker, downloads, evaluate, screenshots, a11y/DOM/
  network observation, broker-only CDP with administrative methods rejected),
  postcondition assertions, REDIRECT_ESCAPE host guard, and the timeout
  taxonomy: Playwright actionability timeout = typed FAILED (command never
  dispatched); wrapper timeout on a state-changing op = OUTCOME_UNKNOWN.
- `convex/merchantBrowser/provider.ts` — canonical provider refactored onto
  Browserbase+Playwright (no parallel subsystem). Real postconditions for
  open/add/update/remove (URL landing, badge increase, exact quantity, badge
  decrease); start/observe/navigate/cart actions return the executor's
  verified evidence only; session release scheduled at every terminal
  transition and invoked directly on owner COMPLETE.
- Truthful LOCAL mode (`SPRESSO_LOCAL_BROWSER_EXECUTOR=1` +
  `SPRESSO_LOCAL_BROWSER_EXECUTOR_PATH`): the SAME executor drives a system
  Chromium against a real local HTTPS merchant server for controlled
  integration testing without provider credentials. Provider recorded as
  `LOCAL` — never mislabeled as BROWSERBASE.
- Verification commands, all passing on this working tree:
  - `npx tsc -p convex/tsconfig.json --noEmit`: pass
  - `npx vitest run`: 164/164 tests, 24 files (includes 9 real-browser
    executor tests and 9 end-to-end provider tests driving a real system
    Chromium against a real local HTTPS merchant origin: start→navigate→
    add-to-cart verified by badge delta→update quantity verified by input
    value→remove→release; authority separation; REDIRECT_ESCAPE; timeout
    taxonomy; parallel-session isolation; connectUrl/debug-URL leakage
    assertions)
  - `npm run test:smoke`: 13/13 pass
  - `npm run test:contracts`: pass

## Exact human/external action required

Provide `BROWSERBASE_API_KEY` (and `BROWSERBASE_PROJECT_ID` if the account
requires it) as Convex deployment env vars, then re-run the controlled flow:

```
npx convex env set BROWSERBASE_API_KEY <key>
npx convex env set BROWSERBASE_PROJECT_ID <project>   # if required
npx vitest run convex/merchantBrowserProvider.test.ts # with LOCAL env unset
```

Remove this BLOCKED marker only after the live flow passes on the real
platform. Per the marker protocol, Phases 3-6 are NOT eligible until a
PHASE-2-DONE.md exists; phase work must remain strictly in order.
