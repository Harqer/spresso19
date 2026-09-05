# Feature merge disposition

This report consolidates the parallel Android, backend, and web reviews. It
classifies feature work by production readiness, not by compile success alone.

## Merge candidates

| Feature | Surfaces | Evidence |
| --- | --- | --- |
| Auth/onboarding | Android/KMP and web | Android compile/unit tests; web lint/build/tests; real Firebase/Auth boundaries present |
| Navigation/adaptive shell | Android Navigation 3 and web routing | Focused action-destination tests and Android compile; route ownership is explicit |
| Discovery/catalog | Android, web, backend provider normalization | Backend build; web build/tests; no owned inventory model |
| Chat streaming | Android and web | Web lint/build/tests; authenticated streaming path exists; UI keeps customer-facing language |
| Wardrobe/saved listings | Android and web | Active callers and route ownership verified; no duplicate dead wardrobe page |
| Cart intent/idempotency | Backend and client routing | Canonical listing schema, quantity limits, Firestore transaction, and idempotency tests/build passed |
| Orders foundation | Backend/web read paths | Retain as foundation, but do not merge any unverified fulfillment claims |

## Hold for remediation

| Feature | Blocking evidence |
| --- | --- |
| Stripe checkout | Missing publishable-key secret binding and external calls inside transaction boundary; needs quote/idempotency/webhook integration tests |
| Coinbase/CDP wallet | Caller-supplied address is not sufficiently proven; transfer records lack UID scoping and confirmation binding |
| Android checkout | Fabricated local authorization IDs and an async navigation race can present checkout before payload readiness |
| CameraX/Smart Vision | Camera ownership is duplicated; photo flow requests microphone permission; instrumentation/device lifecycle evidence is missing |
| Meta DAT | Registration/session/readiness/error lifecycle has not been exercised with MockDeviceKit or Inspector |
| Profile payment/subscription UI | Contains stubs/raw-card or unverified provider paths |
| Grocery/travel/expenses | Feature and provider configuration evidence is incomplete |
| Terraform | Provider schema handshake blocks validation; plan must be regenerated from a pinned toolchain |
| Data Connect | Generated/provider provenance is unresolved; do not treat generated output as authored source |

## Discard or quarantine

- Generated `functions/lib/**` as independent source; regenerate from `functions/src/**`.
- Generated Terraform plan artifacts; keep only recoverable archives.
- Legacy `com.spresso19` Android source after package migration checkpoint and tooling verification.
- Raw-card “Add Card” flow, disabled Coinbase checkout claims, client-only receipt records, and always-failing voice-note actions after caller confirmation.

## Merge order

1. Checkpoint the current workspace on a recovery branch.
2. Merge the candidate foundation slices first: auth, navigation, discovery, chat, wardrobe, cart intent.
3. Keep held payment, camera, DAT, Terraform, and provider work in separate branches until their listed gates pass.
4. Reconcile `main` with its nine upstream commits only after the checkpoint.
5. Run Android, web, backend, and contract test matrices.
6. Run GitNexus compare-mode detection against `main`; investigate every HIGH/CRITICAL result with exact target UIDs.

No held feature should be merged merely because its module compiles. No discard
should occur without a caller search, recovery archive, and a clean verification
run.
