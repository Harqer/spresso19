# Progress

## Active Feature
Reconciliation audit (2026-09-22): the original 8 registered features were traced end-to-end through real callers, backend wiring, auth, state ownership, provider integrations, error paths, and tests. `merchant-browser-automation` is now registered as a ninth PLANNED feature with its implementation contract in `docs/merchant-browser-automation.md`; it is not represented as already implemented.

## Pre-Implementation Gate
All applicable items must be checked before production implementation begins.

- [x] Read active ticket/spec, feature entry, recent git history, and current progress.
- [x] Trace the existing end-to-end execution path and identify the canonical implementation.
- [x] Identify state ownership, auth boundaries, provider boundaries, and platform boundaries.
- [x] Inventory relevant installed skills/plugins/components.
- [x] Read every applicable `SKILL.md` completely.
- [x] Verify version-sensitive APIs against installed package/types and current official docs.
- [x] Inventory legacy/duplicate/dead paths that intersect the feature.
- [x] Record SDK/plugin applicability below; no applicable section is silently omitted.
- [x] Define the production verification required to prove the feature works.
- [x] Confirm the planned path is a real production implementation, not a scaffold/mock/placeholder.

## SDK / Plugin Applicability
Use when an SDK/plugin/component is involved.

| Capability / section | Status | Evidence / reason |
|---|---|---|
| Convex (agent, rate-limiter components; 47-route HTTP bridge) | verified | convex/convex.config.ts mounts both components; codegen + tsc + 74/74 vitest green at commit 0433cc5 |
| Firebase Auth identity in Convex | verified | convex/auth.config.ts pinned to securetoken.google.com/get-spresso; requireFirebaseIdentity on every bridge route; identity.test.ts pins exact strings |
| Stripe (payments, signed webhooks) | verified (code) / unverified (live) | convex/commerce/* + signed constructEventAsync webhook reconciliation; STRIPE_WEBHOOK_SECRET absent from prod vault so live reconciliation fails closed |
| Bunny private media | verified (code) / unverified (live) | convex/media/bunnyStore.ts fails closed without BUNNY_*; BUNNY_* absent from prod vault |
| FAL (try-on generation) | verified (code) / unverified (live) | convex/media/actions.ts typed env access; FAL_API_KEY absent from prod vault |
| Discovery providers (Parallel, SerpApi, Kitesurf via Cloudflare) | verified (code) / unverified (live) | convex/discovery.ts fallback chain + provenance; PARALLEL/SERPAPI/CLOUDFLARE/KITESURF secrets absent from prod vault |
| Cloudflare Browser Run / Kitesurf merchant automation | planned / unverified | Current Kitesurf use is one-shot public inspection only; interactive Browser Sessions, Playwright/CDP tools, Kitesurf→Chromium selection, guardrails, Live View/HITL, merchant cart/account state are specified in docs/merchant-browser-automation.md but not implemented |
| Android chat/browser adaptive UI | dependencies present / implementation planned | Navigation 3, Material 3 Adaptive, Compose, kotlinx.serialization and existing AppTheme/ComponentStyles are present; new supporting-pane/compact browser UI must follow Android CLI adaptive/navigation-3/edge-to-edge/testing guidance |
| Gemini Live (ephemeral token, WS transport) | verified (code) / unverified (device) | convex/ai/liveToken.ts + LiveApiClient.kt; GEMINI_API_KEY present in prod vault |
| Meta Wearables DAT | partial | SpressoWearablesService.kt live path with tool ledger; intent loop broken (no receiver answers SEARCH_PRODUCTS/ADD_TO_CART); DAT pillar evidence not yet recorded |
| Jetpack XR / Compose Glimmer | N/A | No XR display-glasses feature registered in feature_list.json; boundary doc honored |

## Production-Ready Gate
All applicable items must be checked before the feature can be marked passing or work can move to another feature.

- [ ] Production path is fully implemented end to end. *(closed 2026-09-22: wearable intent loop, client checkout surface, realtime barge-in/restart, order-history edge states; remaining code gaps are server-verifiable exact-intent checkout authorization and merchant browser automation — everything else waits on live integration/hardware evidence, not code)*
- [ ] No placeholder, stub, scaffold-only, fake-data, no-op, or mock implementation remains in the production path. *(strict mock scanner green; no dev bypasses found)*
- [ ] Mocks/simulators are confined to tests or official SDK test tooling. *(verified)*
- [ ] Canonical state ownership is preserved; no duplicate backend/auth/tool/state path was introduced. *(Convex canonical; single transport — legacy ApiClient.kt removed 2026-09-22, all consumers on ConvexApi)*
- [ ] Authentication and server-side authorization are verified. *(bridge-wide bearer identity + per-user ownership checks)*
- [ ] External/provider inputs and outputs are validated. *(typed bridge parsers, zod guardrails, provider normalization)*
- [ ] Lifecycle, cancellation, cleanup, retry, timeout, and failure behavior are implemented where applicable. *(media job state machine; LiveApiClient reconnect + restartable close + barge-in playback stop + stale-session frame dropping; weather route bounded fetch; wearable paths unchanged)*
- [ ] Concurrency, ordering, idempotency, and reconciliation are implemented where applicable. *(checkout idempotency, webhookInbox dedupe, tool ledger)*
- [ ] Loading, empty, stale, unsupported, unavailable, failed, rate-limited, and success states are preserved where meaningful. *(rate limiter component wired; UI-state audit pending per screen)*
- [ ] Applicable SDK/plugin capability rows above are verified or explicitly N/A with reason. *(see table)*
- [ ] Targeted tests/checks pass. *(96/96 convex vitest incl. order-history edge suites + weather boundary tests, contracts, smoke, boundary suites)*
- [ ] Negative/error/authz paths pass. *(identity/ownership tests green; grocery + order-history edge suites shipped 2026-09-22)*
- [ ] Applicable broader CI/static/security/dependency checks pass. *(npm audit 0 vulns; lint green)*
- [ ] Convex codegen/typecheck/deployment compilation passes when Convex is affected. *(green at 0433cc5)*
- [ ] Applicable KMP/Android/Web targets compile. *(commonMain metadata, androidMain, wasmJs all green)*
- [ ] Optimized/release build passes where applicable. *(wasmJs production distribution green, bundle 19.9/32MiB)*
- [ ] Real integration/hardware verification is complete when mocks cannot prove production behavior. *(NOT DONE — this is the gate nothing currently passes)*
- [ ] Any discovered legacy/duplicate/dead implementation has been migrated or removed safely. *(gemini-streaming-mcp/ removed 2026-09-22; ApiClient.kt consolidation completed 2026-09-22 — façade methods ported to ConvexApi, 30+ call sites repointed, dead DTOs/audio branch dropped, AppCheck interceptor unified into the shared Convex client, weather context moved behind /api/context/weather)*
- [ ] `feature_list.json` is updated only after the above evidence exists. *(updated 2026-09-22 with audited statuses)*
- [ ] Coherent working state is committed. *(this commit)*

## Completed
- Realtime barge-in + session reconciliation (2026-09-22): interruption frames stop queued playback (onPlaybackInterrupted -> AudioPlayer.stop), endOfTurn applies the same reset, monotonic sessionGeneration drops stale post-reconnect frames and resets the transcript, close() is restartable (per-connect client recreation), and App.kt stop paths route through ChatViewModel.stopVoiceStream so voice state and transport never desync.
- Order-history edge tests + UI state reconciliation (2026-09-22): acknowledgeDelivery/reminder/requestReturn ownership + validation + idempotency suites (96/96 backend tests); OrderRecordCard renders human-readable fulfillment labels with unknown-state passthrough and gates Return on returnable states + null returnStatus.
- Reconciliation audit of the original 8 registered features against repository reality (2026-09-22).
- 4 features moved from `unverified` to `IMPLEMENTED_BUT_UNVERIFIED` with evidence: product-discovery, virtual-try-on, screen-product-discovery, grocery-list, order-history.
- Agentic Checkout is `PARTIAL`: the payment path is wired, but the strong biometric assertion is discarded client-side and Convex receives only `attemptId`, so the server cannot prove biometric/MFA authorization.
- Merchant Browser Automation registered as a ninth `PLANNED` feature with a chat-first adaptive UI + Browser Run/Kitesurf backend/integration blueprint.
- Checkout wired end-to-end (2026-09-22): bridge routes `/api/checkout/attempt|prepare|confirm`, ConvexApi client methods, CatalogViewModel lifecycle (acquire → server-verified quote → biometric step-up → off-session confirm), CheckoutConfirmDialog, server-side `confirmCheckout` action charging the saved default card with Stripe `off_session` SCA, `failCheckoutAttempt` transition, and `convex/grocery.test.ts`.
- Wearable intent loop verified closed: MainActivity's RECEIVER_NOT_EXPORTED receiver answers SEARCH_PRODUCTS/ADD_TO_CART/START_CHECKOUT — earlier dead-end evidence was stale.
- `gemini-streaming-mcp/` removed with its release.yml cache line and ci-gate entries.

## Verified
- None. No feature satisfies the Production-Ready Gate's real integration/hardware verification, and live provider paths are blocked on production vault secrets. Nothing is marked VERIFIED without that evidence.

## Open / Blocked
- **Blocked on prod vault (Infisical prod -> Convex prod)**: PARALLEL_API_KEY, SERPAPI_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KITESURF_ALLOWED_DOMAINS, STRIPE_WEBHOOK_SECRET, FAL_API_KEY, BUNNY_* — live discovery, merchant verification, webhook reconciliation, try-on, and media delivery fail closed until provisioned.
- **Open (code)**: server-verifiable exact-intent checkout authorization; merchant Browser Sessions + adaptive chat/browser UI; in-flight tool-call reconciliation on disconnect for realtime AI (barge-in/restart itself shipped 2026-09-22); order-history code is complete, remaining work is live carrier/fulfillment evidence.
- **Duplicates awaiting removal (root-caused, do not delete in a feature pass)**: none remaining — `ApiClient.kt` legacy transport was consolidated into `ConvexApi.kt` and deleted 2026-09-22 (its direct provider call for weather moved behind `/api/context/weather`; per-instance `close()` calls that could kill the shared HTTP client were removed).

## Decisions
- VERIFIED is never granted without Production-Ready Gate evidence; IMPLEMENTED_BUT_UNVERIFIED is the ceiling for code-complete features without live runs.
- Harness registry is a subset of the repo: travel, creator studio, trial/entitlements, wardrobe, users/profile, vision pipeline, and the Stripe plane are implemented and tested but not registered features; they are recorded here rather than invented into feature_list.json.
- Convex production deployment is `woozy-anteater-572` (HTTP bridge `https://woozy-anteater-572.convex.site`); dev deployment `decisive-dolphin-161` is never evidence of production wiring.
- Merchant automation uses Cloudflare Browser Sessions behind Convex-owned typed tools/state: Kitesurf for compatible short/stateless tasks, Chromium for authenticated/persistent/HITL flows. Quick Actions remain bounded extraction/verification, not merchant-session automation.
- Chat/browser UI uses the existing Material 3 theme, Navigation 3, Material 3 Adaptive and edge-to-edge; no hard-coded palette or duplicate theme.

## Next
1. Implement server-issued exact-intent checkout authorization and verify biometric/passkey + MFA proof in Convex; add bypass/replay/expiry/material-change tests.
2. Implement `merchant-browser-automation` from `docs/merchant-browser-automation.md`: Convex session/events/tools → Browser Run Playwright/CDP → Kitesurf/Chromium engine selection → adaptive chat/browser UI → Live View/HITL.
3. Implement in-flight tool-call reconciliation on disconnect for realtime AI (barge-in/restart DONE 2026-09-22).
4. ~~Order-history edge-case tests~~ DONE 2026-09-22 (ownership/validation/idempotency suites; UI state gating shipped). Also DONE 2026-09-22: wearable intent receivers, client checkout surface, ApiClient.kt consolidation.
5. Provision prod vault secrets, then run live provider verification before promoting any affected feature to VERIFIED.

## Active Issue / PR
-

## Last Updated
2026-09-22 (merchant browser automation + checkout-authorization harness correction; realtime barge-in/restart + order-history edges implemented)
