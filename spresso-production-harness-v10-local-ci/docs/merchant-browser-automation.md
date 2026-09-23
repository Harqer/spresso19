# Merchant Browser Automation + Chat UI Blueprint

This is the implementation contract for merchant-side browser automation and its chat-first UI. It complements `docs/features.md`; it does not create a parallel backend or a second design system.

## Product contract

Spresso has distinct state domains:

1. **Chat intent** — what the user asked for.
2. **Spresso cart** — user-owned intent stored by Spresso.
3. **Merchant browser session** — remote browser state at a specific merchant.
4. **Merchant cart/account** — external state observed or changed through that browser.
5. **Purchase authorization** — explicit, server-verifiable user authority for an exact transaction.

Never collapse these into one "checkout" state. AI intent can start reversible preparation, but it cannot manufacture account-disclosure or payment authority.

## Frontend: chat-first adaptive browser UI

### Existing path to trace first

Before editing, trace the current callers and state flow through:

- `composeApp/src/commonMain/kotlin/components/features/chat/PersonalAIShopperChatPage.kt`
- `composeApp/src/commonMain/kotlin/components/features/chat/PersonalAIShopperChatPanel.kt`
- `composeApp/src/commonMain/kotlin/components/features/chat/AIShopperInputBar.kt`
- `composeApp/src/commonMain/kotlin/components/shared/overlays/GlobalChatOverlay.kt`
- `composeApp/src/commonMain/kotlin/components/navigation/AdaptiveNavigationScaffold.kt`
- `composeApp/src/commonMain/kotlin/navigation/NavKey.kt`
- `composeApp/src/commonMain/kotlin/viewmodels/ChatViewModel.kt`
- `composeApp/src/commonMain/kotlin/theme/Theme.kt`
- `composeApp/src/commonMain/kotlin/theme/ComponentStyles.kt`

Repair these canonical surfaces instead of adding a second chat shell.

### Visual/layout contract

Recreate the approved chat + browser composition, not its literal colors.

**Compact width / phone**
- Chat remains the primary surface and owns most vertical space.
- Keep history in a `LazyColumn`; the composer remains sticky at the bottom.
- Show active merchant automation as a compact browser card above the composer: merchant/domain, live state, product/page summary, current action, and `Expand`, `Pause/Resume`, `Take over`.
- Expanding the browser must not destroy chat state or replace its back stack. Use the same serializable session key/state when moving to an expanded browser destination.
- Do not auto-scroll the user away from older history. Auto-follow only when already near the bottom; otherwise preserve position and show a new-activity affordance.

**Medium / expanded width**
- Chat is the main pane (~60–70% conceptually, determined adaptively rather than hard-coded pixels).
- Browser automation is a supporting pane (~30–40% conceptually).
- Use Navigation 3 + Material 3 Adaptive `SupportingPaneSceneStrategy` for the related chat/browser destinations rather than hand-built breakpoint navigation.
- Browser pane hierarchy: session header → Browser/Steps switch → live page preview → concise progress timeline → Pause/Resume/Take over controls.
- Chat may include meaningful automation events (opened page, selected variant, added to merchant cart, needs handoff); verbose browser traces stay in the Steps pane.

### Material 3/theming contract

- Use the existing `AppTheme`, `MaterialTheme.colorScheme`, `MaterialTheme.typography`, `MaterialTheme.shapes`, and existing `SpressoTheme/ComponentStyles`.
- **No hard-coded RGB/ARGB/hex colors.** The reference mockup defines hierarchy and composition, not a replacement palette.
- Do not introduce a second theme, duplicate color constants, or screen-local design tokens.
- Prefer Material 3 components and semantic theme roles. New custom components must consume theme tokens instead of embedding colors or text styles.
- Respect light/dark/dynamic color through the existing theme.
- Do not force migration to the experimental Compose Styles API merely for this feature.

### Edge-to-edge + IME

- Keep the screen edge-to-edge.
- Apply `Scaffold`/Material inset handling once; avoid double-padding.
- Pass safe-area padding to `LazyColumn.contentPadding` so chat content can scroll behind bars while first/last items remain reachable.
- Keep the composer clear of the IME using the current Edge-to-edge skill guidance; prefer `fitInside(WindowInsetsRulers.Ime.current)` or one correctly-consumed IME strategy rather than stacking `imePadding()` and navigation padding blindly.
- Verify status/navigation-bar legibility and large-font behavior.

### State/contracts

Use typed `@Serializable` commonMain contracts; no loosely typed maps or log strings as UI state.

Minimum state model:

- `MerchantBrowserSessionUiState`: sessionId, merchantHost, engine, status, currentStep, pageTitle, preview/live-view availability.
- `MerchantBrowserStatus`: STARTING, ACTIVE, PAUSED, HANDOFF_REQUIRED, HUMAN_CONTROL, RESUMING, COMPLETED, FAILED, EXPIRED.
- `MerchantBrowserEvent`: stable eventId, sequence, semantic type, customer-safe summary, timestamp, optional product/variant reference.
- Navigation keys for browser detail/takeover are `@Serializable` Navigation 3 keys; pass identifiers, not entire mutable session payloads.
- Decode network contracts with `kotlinx.serialization`; keep provider JSON outside composables and normalize it before UI state.

### Live browser rendering

- Passive viewing and interactive takeover are different permissions.
- Prefer a short-lived **read-only Live View** for normal observation. Treat the Live View URL as a credential: never log it, persist it, put it in analytics, or expose the Cloudflare API token.
- Interactive Live View is created only after `Take over`; automation transitions to HUMAN_CONTROL and stops issuing page actions until handoff completion.
- Implement browser rendering behind a platform boundary (for example an `expect/actual` browser surface). Do not couple commonMain UI to Android WebView APIs.
- If current Cloudflare Live View cannot be safely embedded on a platform, render bounded session screenshots/previews in-pane and open the short-lived interactive Live View in a trusted platform browser surface for takeover. Do not fake a live browser.

### Frontend skills

Use these before implementation:
- `android-cli` — current Android docs + device/layout inspection.
- `adaptive` — compact/medium/expanded behavior and supporting pane.
- `navigation-3` — serializable destinations, supporting pane, browser expansion/back behavior.
- `edge-to-edge` — system bars, scrolling content, IME/composer insets.
- `testing-setup` — Compose behavior + screenshot coverage across form factors/font scale.
- `android-intent-security` — secure any external/Live View handoff or app intent boundary.
- `gitnexus-exploring` + `gitnexus-impact-analysis` — trace and gate edits to the existing chat/navigation path.

## Backend: Cloudflare Browser Run / Kitesurf

### Provider model

Interactive automation uses **Browser Sessions**, not the existing one-shot Kitesurf JSON Quick Action.

- **Kitesurf CDP**: use for compatible short-lived, stateless/ephemeral agent tasks where it can render/interact reliably.
- **Chromium Browser Run**: use when the flow needs long-running authenticated state, persistent cookies, MFA/SSO/CAPTCHA handoff, a real Chromium/TLS fingerprint, or Kitesurf compatibility fails.
- The current Quick Action path may remain for bounded public extraction/quote verification. It is not the merchant automation session.
- Verify the current Cloudflare Browser Run/Kitesurf docs before implementation; Browser Run APIs are version-sensitive.

Use Playwright over CDP as the default control library from the server-side Node action boundary; do not expose raw Playwright/CDP to the LLM.

### Canonical ownership

Convex remains the backend authority for browser workflow state. Cloudflare is an execution provider, not a second application backend.

Do not revive Firebase Functions or `services/openclaw` as a parallel commerce authority. Trace existing call sites first; migrate/remove legacy browser paths safely when they intersect this feature.

Suggested Convex state:
- `merchantBrowserSessions`: owner tokenIdentifier, merchant host, provider session id, engine, status, sanitized current URL, created/updated/expires timestamps, last action/idempotency data, handoff state.
- `merchantBrowserEvents`: session id, monotonic sequence, semantic event type, customer-safe summary, provider timestamp, action id.
- Short-lived profile-disclosure authorization may store only approved field names + expiry/consumption state. Never store merchant passwords, Firebase credentials, PAN/CVV, raw browser cookies, or Live View URLs.

All owner reads/writes use indexed owner/session lookups and bounded/paged event reads.

### Typed browser tools

The LLM chooses semantic intent; deterministic code validates and executes it.

Provide narrow tools such as:
- `merchant_open_product`
- `merchant_select_variant`
- `merchant_add_to_cart`
- `merchant_update_quantity`
- `merchant_remove_item`
- `merchant_begin_account_flow`
- `merchant_fill_approved_profile`
- `merchant_continue_checkout`
- `merchant_request_handoff`
- `merchant_observe_cart`

Do **not** give the model arbitrary `page.evaluate`, raw JavaScript execution, unrestricted selectors, unrestricted navigation, or generic shell/browser access.

Every tool invocation validates: authenticated owner, session state, merchant/domain policy, typed arguments, action class, replay/idempotency key, budget/rate limits, and whether user approval is required.

### Permission classes

- **Autonomous/reversible:** navigate allowed merchant pages, search, choose an already-specified variant, add/remove/update merchant-cart items, read cart state.
- **Explicit user approval:** create a merchant account, disclose saved profile/address/phone/email fields, make a material substitution outside the user's stated constraints.
- **Human handoff:** MFA, SSO, CAPTCHA, credential entry, or sensitive fields the user should enter directly.
- **Purchase commit:** separate exact transaction authorization; never inferred from prior chat/browser/account approval.

Spresso/Firebase credentials are never reused as merchant credentials. Prefer guest checkout when available unless the user asks for an account.

### Session/network security

- Start Browser Sessions with Cloudflare session guardrails for the merchant and required dependency domains. Guardrails are fixed for that session lifetime.
- HTTPS only. Validate redirects and final merchant host against policy.
- Treat page content, accessibility trees, model output, and browser DOM as untrusted.
- Pause browser actions before HUMAN_CONTROL. Resume only after a verified handoff-complete transition.
- Generate Live View URLs server-side with short expiry; do not persist or log them.
- Redact URLs/query parameters, PII, cookies, tokens, form values, and provider secrets from logs/session events.
- External actions are idempotent/reconcilable; retries must observe current page/cart state before repeating a side effect.
- Session cleanup must close/expire remote sessions and mark Convex state terminal.

### Backend skills

Use these before implementation:
- `convex-expert` — canonical Convex schema/actions/internal boundaries.
- `convex-authz` — owner/session/profile-disclosure authorization.
- `convex-agent` — semantic tool definitions and durable AI/tool context.
- `convex-test` + `convex-reviewer` — deterministic auth/error/state-machine coverage and review.
- `convex-launch-readiness` / `convex-verify` — production verification without treating code-only checks as live proof.
- `security-best-practices` + `security-threat-model` — browser/session/credential/prompt-injection boundary.
- `gitnexus-exploring` + `gitnexus-impact-analysis` — trace current Kitesurf/OpenClaw/checkout callers before migration.

## Integration wiring

Canonical flow:

`Chat/voice intent → Convex Agent typed tool → Convex authorization/state transition → Browser Run session action → normalized browser result/event → Convex durable session state → existing authenticated KMP transport → Compose chat + browser pane`

Rules:
- Reuse `ConvexApi`/the canonical authenticated client path; do not add another app API client or direct Cloudflare calls from Android/Web.
- Keep Cloudflare account/token secrets server-side in Infisical → Convex runtime env.
- Browser provider responses are normalized server-side into stable serializable contracts before reaching KMP.
- Browser UI state survives rotation/process recreation through stable session ids and server state; do not store the browser as mutable UI-only state.
- If the current KMP transport lacks realtime subscriptions, use one bounded typed session-state/event endpoint with controlled polling; do not introduce an unrelated realtime backend.
- Keep Spresso cart and merchant cart explicitly separate in naming, schema, tools, UI copy, and tests.
- Merchant browser preparation may feed Agentic Checkout, but purchase authorization remains a separate server-verifiable gate.

## Verification

Frontend:
- Screenshot tests at compact/medium/expanded sizes, light/dark theme, 1.5 font scale.
- Behavior tests for history-preserving scroll, compact→expanded browser transitions, pause/resume, takeover, return control, process/state restoration, IME, and edge-to-edge.
- Device verification with `android layout` / `android screen` after reading the Android CLI interaction guidance.

Backend/integration:
- Tests for cross-user denial, disallowed domain, redirect escape, stale/replayed action, duplicate add-to-cart, session expiry, Kitesurf→Chromium fallback, profile disclosure without approval, Live View URL leakage, handoff pause/resume, and terminal cleanup.
- Live provider verification must prove at least one compatible merchant cart flow and one human-handoff flow. Do not mark VERIFIED from mocks or Quick Action extraction alone.
- Final purchase tests must separately prove the exact purchase authorization boundary; successful merchant-cart automation is not payment authorization.
