# GitNexus quality decision matrix

This matrix consolidates the parallel audits. It is a cleanup decision record,
not authorization to delete files. Any discard action must first pass caller,
manifest/export, regeneration, and verification checks.

| Domain | Retain as canonical | Quarantine/archive candidate | Required gate before discard |
| --- | --- | --- | --- |
| Android/KMP | `composeApp/src/commonMain/**`, canonical `com.spresso` Android sources, shared Navigation 3/Compose | tracked `com.spresso19` migration remnants; stale `composeApp/build/**`; duplicate camera ownership | import/manifest/deep-link search, Android compile, instrumentation evidence, explicit package-migration checkpoint |
| CameraX/vision | CameraX capture and vision sources after ownership split | dead capture paths and duplicate analyzers | caller impact, permission/lifecycle/capture-failure tests, device verification |
| Meta DAT | DAT registration/session/service/display sources | none by filename alone; incomplete lifecycle paths remain production candidates | required DAT skills, MockDeviceKit/Inspector validation, denial/disconnect/pause/resume/terminal/error coverage |
| Backend | `functions/src/**`, canonical cart, merchant quote/Stripe webhook, discovery, orders, safety tests | `functions/lib/src/**`, orphaned compiled crypto tools, legacy `addToCart.ts` after caller migration | export/caller search, source rebuild, contract tests, deploy/export inspection |
| Generated backend | reproducibly generated `functions/lib/**` and Data Connect output only if policy requires tracking | stale JS/maps with no source, duplicate compiled paths | pin toolchain, rebuild from source, byte-for-byte/provenance review |
| React/Vite | feature-rich `src/**` companion surface and tests | stale `src/db/**`, unused duplicate pages, generated Data Connect SDK copies | caller search, web build/tests, explicit legacy-adapter decision |
| Terraform | approved Spanner catalog, Cloud Run boundary, networking/IAM/APIs/Secret Manager | `terraform/tfplan` binary until regenerated with pinned toolchain | provider/toolchain fix, `fmt`, `init -backend=false`, `validate`, reviewed plan |

## Cleanup order

1. Create a recoverable checkpoint of the whole workspace.
2. Freeze the canonical source paths above.
3. Migrate callers away from each candidate, one candidate group at a time.
4. Archive generated/stale files outside the active source tree before deletion.
5. Run focused tests/builds and exact GitNexus impact for the candidate symbols.
6. Delete only candidates whose gates pass and whose recovery copy exists.
7. Refresh GitNexus and run compare-mode detection after each domain cleanup.

The current aggregate GitNexus critical result remains a baseline until these
groups are separated into reviewable commits. No candidate is safe to discard
solely because it has few or zero graph callers; GitNexus explicitly reports
that unresolved dynamic and cross-language edges can produce false empties.
