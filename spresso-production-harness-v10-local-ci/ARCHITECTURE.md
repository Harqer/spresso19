# Spresso Architecture

- KMP owns shared domain/business state with platform-specific Android/Web boundaries.
- Firebase Auth supplies identity. Convex validates identity and owns backend authorization.
- Convex owns canonical application state, realtime state, workflows, AI/tool orchestration, scheduling, and backend functions.
- Infisical is the source of application secrets. Runtime environment variables required by Convex/providers are injected through the existing secure deployment path.
- Bunny owns private media storage/delivery where configured; Convex owns canonical metadata/provenance.
- Realtime voice/video uses a dedicated media transport; durable session/tool/business state remains in Convex.
- Meta AI glasses use the official Meta Wearables DAT Android SDK.
- Android XR display glasses use Jetpack XR / Compose Glimmer. Do not merge DAT and Glimmer runtimes.

## Invariants

- one canonical owner/path per responsibility
- no parallel auth/backend/state/tool path without an explicit architectural reason
- preserve meaningful states: empty, stale, unsupported, unavailable, failed, rate-limited, pending, reconciliating
- external/provider data is untrusted until validated
- AI proposes; deterministic code validates, authorizes, and executes typed tools
- purchases require explicit biometric + MFA confirmation bound to the exact immutable purchase intent
- material purchase changes invalidate authorization
- external side effects are idempotent/reconcilable
- no placeholders, dead compatibility paths, hidden failures, disabled checks, or catch-to-fake-success behavior
