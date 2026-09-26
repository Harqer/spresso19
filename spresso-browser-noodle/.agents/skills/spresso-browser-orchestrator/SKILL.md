---
name: spresso-browser-orchestrator
description: Route and report the six-phase Spresso Muse-parity browser/purchasing implementation. Use to inspect phase status, identify the next eligible phase, or explain blockers. It coordinates; it does not implement phase code.
---

# Spresso browser orchestrator

Read:
- `.agents/skills/spresso-browser-orchestrator/references/architecture-contract.md`
- `.agents/skills/spresso-browser-orchestrator/references/phase-markers.md`

Inspect `docs/browser-automation/PHASE-*-DONE.md` and `PHASE-*-BLOCKED.md`.

The only valid implementation order is:

1. contracts
2. runtime
3. experience
4. security
5. purchase
6. verification

Report:
- completed phases;
- blocker markers;
- earliest eligible phase;
- whether `.noodle.toml` mode is `auto`, `supervised`, or `manual`.

Never mark a phase complete yourself and never dispatch a later phase around a missing predecessor.

Recommended mode is `supervised`: scheduling/dispatch is automatic, merges require the user. Phase 4 and Phase 5 are not allowed to execute changes in `auto`.
