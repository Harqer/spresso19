---
name: spresso-browser-phase-6-verification
description: Verify Muse browser/shopping parity end-to-end, run live/adversarial/build gates, measure baseline latency/token behavior, and remove superseded duplicate browser/commerce paths.
schedule: "Run only after PHASE-5-DONE.md exists and PHASE-6-DONE.md and PHASE-6-BLOCKED.md are absent."
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

# Phase 6 — parity verification, live tests, cleanup

## Nested skills

Load `convex:convex-reviewer` for final backend review. Load `convex:convex-expert` for any Convex remediation.

Use the installed Playwright skill if available for live/tracing test procedure. Use the JetBrains AGP9 skill only if final Gradle failures reveal a real KMP/AGP 9 issue.

## Goal

Prove the implemented system satisfies the browser/shopping Muse-parity target and security invariants, then remove obsolete parallel paths. Do not introduce WebCMD/caching in this phase.

## Muse capability matrix

Create `docs/browser-automation/muse-parity.md`.

For each applicable capability record:
- documented Muse capability;
- Spresso code path;
- automated/live test;
- result;
- any deliberate Spresso enhancement.

At minimum cover:
- arbitrary browsing/navigation;
- multi-step tasks;
- site search;
- multi-site parallel work;
- forms;
- JS-heavy apps;
- iframes/tabs/popups;
- uploads/downloads;
- authenticated sites;
- ordinary conversational questions while task is active;
- secure auth/user takeover;
- resume after intervention;
- shopping/cart manipulation;
- checkout preparation;
- critical purchase approval;
- purchase submission;
- visible browser state;
- audit history/background continuation semantics used by this feature.

A missing capability is a failed phase, not a documentation note.

## Live scenario tests

Use controlled real Browserbase Chromium.

Required scenarios:
1. search retailer -> open product -> variant -> cart;
2. update/remove cart;
3. form fill with missing ordinary input pause/resume;
4. custom React/Material/Radix control;
5. iframe/popup/tab;
6. file upload/download;
7. authentication takeover;
8. MFA/CAPTCHA takeover path;
9. two or more merchants in parallel;
10. checkout preparation;
11. purchase approval invalidation on changed total;
12. provider/session crash and safe recovery/reconciliation.

Do not perform an uncontrolled real-money purchase as a test. Use provider sandbox/test environments or a controlled merchant fixture for the payment boundary.

## Security regression suite

Re-run every Phase-4 and Phase-5 adversarial test. Store bounded reports, not secrets.

## Repository cleanup

After tests prove the new path:
- remove/retire Kitesurf interactive checkout code;
- remove synthetic browser operations;
- remove obsolete Cloudflare provider code if no longer used for a distinct public-read capability;
- remove legacy Firebase Functions commerce/browser authority that the canonical Convex path supersedes;
- keep Firebase Auth;
- keep `services/openclaw` only if it has an independently used non-commerce role; otherwise remove dead/duplicate browser authority after checking all imports/workflows;
- remove duplicate tables/fetchers/session managers/rate limiters/jobs introduced by previous architecture.

Never delete a legacy path merely because its name is old; prove no required caller depends on it.

## Build gates

Run the repository's actual commands, including:
- root TypeScript lint/typecheck;
- Convex tests;
- merchantBrowser tests;
- commerce/payment tests;
- security/adversarial tests;
- smoke/no-synthetic-success tests;
- KMP/Android build;
- Android lint;
- relevant unit/integration tests;
- any CI wiring/dependency checks affected by new packages.

Also run a Convex reviewer pass and fix all critical/important findings.

## Performance evidence

Record:
- median browser session creation time;
- median reconnect time;
- model/tool turns for the standard Vans-like workflow;
- browser batch count;
- browser execution latency;
- multi-store wall-clock behavior;
- Browserbase session minutes/cost estimate;
- token counts if already instrumented.

This phase establishes a baseline only. Cross-task WebCMD caching remains deferred.

## Final completion marker

Write `PHASE-6-DONE.md` only when:
- parity matrix is fully green for in-scope capabilities;
- security/payment suites pass;
- all build/lint/test gates pass;
- obsolete parallel implementations are removed or explicitly justified;
- no high-severity reviewer finding remains.

Summarize the final architecture and deferred optimization work in the marker.
