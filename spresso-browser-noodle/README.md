# Spresso Browser Automation — Noodle Orchestration Bundle

This bundle splits the Spresso Muse-parity browser/purchasing implementation into six context-bounded Noodle phases.

## Install

From the extracted bundle:

```bash
./install.sh /path/to/spresso19
```

The installer:
- copies the seven project skills into `.agents/skills/`;
- creates `docs/browser-automation/README.md` if absent;
- creates `.noodle.toml` from the bundled supervised template only when the target repo does not already have one;
- never overwrites an existing skill unless `--force` is supplied.

Recommended mode:

```toml
mode = "supervised"
```

Noodle then schedules/dispatches each phase automatically, while you approve each merge. The next phase becomes eligible only after the previous phase's `PHASE-N-DONE.md` marker is merged.

Manual mode is supported: invoke the phase skill yourself in order.

Auto mode is intentionally rejected by phases 4 and 5 because those phases change security and payment authority.

## Phase graph

1. `spresso-browser-phase-1-contracts` — repository truth, canonical state/schema/contracts, dependency boundary.
2. `spresso-browser-phase-2-runtime` — Browserbase + Playwright live browser executor, real browser tools, batching, multi-store sessions.
3. `spresso-browser-phase-3-experience` — KMP/AGP 9/Jetpack Compose conversational browser UX, secure takeover, user-input resume.
4. `spresso-browser-phase-4-security` — per-merchant containment, forced egress, SSRF, prompt injection, PII and download controls.
5. `spresso-browser-phase-5-purchase` — UCP/AP2 negotiation, non-AP2 payment fallback, exact approval, retailer-order truth.
6. `spresso-browser-phase-6-verification` — Muse parity matrix, adversarial/live tests, cleanup, full build gates.

## Nested skills

The bundle references vendor/platform skills when they are relevant and avoids loading skills whose architecture conflicts with this implementation. See:

`.agents/skills/spresso-browser-orchestrator/references/nested-skills.md`

The phase prompt includes a technical fallback whenever a specialist skill is unavailable.

## Deferred by design

This core pass does **not** implement WebCMD/site-memory caching, learned merchant workflows, persistent Browserbase Contexts, or cross-task selector repair. Those are later token/latency optimizations after the live browser/purchase path is correct.

## Status

Invoke `spresso-browser-orchestrator` to report the earliest incomplete phase and any blocker.
