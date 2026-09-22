# Production Workflow

## 1. Pre-Implementation Gate
Read `PROGRESS.md`, `feature_list.json`, recent git history, the active ticket, and the active feature. Trace the current end-to-end path, load the relevant installed skills/plugins, and complete the applicable Pre-Implementation Gate.

## 2. Implement
Stay on one feature until its real production behavior is complete. Repair the canonical path instead of adding parallel implementations. Preserve auth/ownership, lifecycle/cleanup, concurrency/order, idempotency/reconciliation, domain states, provenance, provider failure semantics, and supported behavior.

Mocks/simulators are test-only or official SDK test tooling. Production completion cannot be a scaffold, stub, placeholder, fake-data path, or no-op integration.

## 3. Execute the Gate
After implementation run:

```sh
bash scripts/ci.sh
```

Do not first reinterpret the CI document into a custom checklist. The executable gate is canonical.

Failure loop:

`CI → inspect evidence → fix root cause → rerun failed/full gate`

Do not suppress, disable, weaken, or delete checks to get green.

Husky executes the same gate on `pre-push`.

## 4. Production-Ready Gate
Only after `scripts/ci.sh` is clean, finish every applicable Production-Ready Gate item in `PROGRESS.md`, including real integration/hardware evidence that static/local CI cannot prove.

## 5. Finish
Then update `feature_list.json`, update `PROGRESS.md`, commit the coherent state, and move to the next feature.
