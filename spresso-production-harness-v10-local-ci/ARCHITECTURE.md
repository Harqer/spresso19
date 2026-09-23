# Spresso Architecture

- KMP owns shared domain/business state with platform-specific Android/Web boundaries.
- Firebase Auth supplies identity. Convex validates identity and owns backend authorization.
- Convex owns canonical application state, realtime state, workflows, AI/tool orchestration, scheduling, and backend functions.
- Infisical is the source of application secrets. Runtime environment variables required by Convex/providers are injected through the existing secure deployment path.
- Bunny owns private media storage/delivery where configured; Convex owns canonical metadata/provenance.
- Realtime voice/video uses a dedicated media transport; durable session/tool/business state remains in Convex.
- Cloudflare Browser Run is the external merchant-browser execution provider. Convex owns merchant-browser workflow/session/event state.
- Kitesurf is for compatible short/stateless browser tasks. Use Browser Run Chromium for authenticated/persistent sessions, MFA/SSO/CAPTCHA handoff, or Kitesurf-incompatible sites.
- Meta AI glasses use the official Meta Wearables DAT Android SDK.
- Android XR display glasses use Jetpack XR / Compose Glimmer. Do not merge DAT and Glimmer runtimes.

## UI invariants

- Chat is the primary commerce surface; merchant browser automation is a supporting surface.
- Compact layouts keep chat history visible and show a compact browser card above the composer. Medium/expanded layouts use an adaptive supporting pane.
- Use the existing Material 3 `AppTheme`/Spresso theme and semantic theme roles. Do not hard-code RGB/ARGB/hex colors or introduce a second palette.
- Use Navigation 3 + Material 3 Adaptive for related chat/browser destinations and preserve serializable navigation state.
- Keep the chat/browser experience edge-to-edge with correct system-bar and IME inset handling.
- Browser preview, progress events, pause/resume, takeover, and return-control state come from typed session state; do not render raw provider/debug logs as product UI.

## Browser/commerce invariants

- Spresso cart, merchant cart, merchant account/session, and purchase authorization are distinct state domains.
- one canonical owner/path per responsibility
- no parallel auth/backend/state/tool path without an explicit architectural reason
- preserve meaningful states: empty, stale, unsupported, unavailable, failed, rate-limited, pending, reconciling
- external/provider/page data is untrusted until validated
- AI proposes semantic intent; deterministic code validates, authorizes, and executes typed tools
- the LLM never receives unrestricted Playwright/CDP/JavaScript/browser access
- Cloudflare Browser Sessions use session-level destination guardrails; Live View URLs are short-lived credentials and are never persisted/logged
- merchant login/account/profile disclosure never reuses Firebase credentials and requires the permission class defined in `docs/merchant-browser-automation.md`
- purchases require explicit server-verifiable biometric + MFA confirmation bound to the exact immutable purchase intent
- material purchase changes invalidate authorization
- reversible merchant-cart automation is not purchase authorization
- external side effects are idempotent/reconcilable
- no placeholders, dead compatibility paths, hidden failures, disabled checks, or catch-to-fake-success behavior

See `docs/merchant-browser-automation.md` for the frontend/backend/integration blueprint.
