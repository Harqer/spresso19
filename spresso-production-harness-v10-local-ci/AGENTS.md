# Repository Instructions

Read `PROGRESS.md`, recent git history, the active ticket, `docs/workflow.md`, and the active feature in `docs/features.md` before editing.

Work on one feature at a time. Trace the existing end-to-end path before changing it.

Use installed skills/plugins as the implementation source of truth. Inventory the relevant skill set and read every applicable `SKILL.md` completely. Verify version-sensitive APIs against installed package/types and current official docs.

## Gates

Complete the applicable **Pre-Implementation Gate** in `PROGRESS.md` before coding.

Implement the real production path. Scaffolds, placeholders, stubs, fake data, no-op adapters, or mocks are not substitutes for production behavior; mocks/simulators belong only in tests or official SDK test tooling.

After implementation, execute `bash scripts/ci.sh`. Do not replace the gate with a prose review. Treat failures as the next work items: diagnose → repair root cause → rerun until clean or genuinely externally blocked.

Husky runs the same gate on `pre-push`.

Do not mark a feature complete or move on until the applicable **Production-Ready Gate** is checked with evidence.

Project decisions:
- Firebase Auth = identity
- Convex = backend authorization/state/workflows
- Infisical = secret source
- Bunny = private media where configured

Update `PROGRESS.md` and `feature_list.json` before ending.
