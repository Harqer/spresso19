# Merchant Browser Automation Contract

## Overview

Spresso's merchant browser automation enables agentic shopping while keeping humans in control of financial actions. Convex owns all durable workflow state; Cloudflare Browser Run is only the execution provider. Sessions are owner-scoped, and events are an append-only, monotonic-sequence log with customer-safe summaries only.

## Architecture

### Owners and Boundaries

- **Convex**: Durable state owner (`merchantBrowserSessions`, `merchantBrowserEvents`)
- **Cloudflare Browser Run**: Execution provider only (sessions, CDP, Live View)
- **Kitesurf**: Stateless V8 isolate browser for short-lived tasks
- **Chromium**: Persistent browser sessions for authenticated shopping workflows
- **Android Client**: Owner-controlled UI, receives only customer-safe data

### State Machine

```
STARTING → ACTIVE → (PAUSED ↔ RESUMING → ACTIVE) → COMPLETED
                    ↘ HANDOFF_REQUIRED → HUMAN_CONTROL → RESUMING
Any state → FAILED / EXPIRED (terminal)
```

### Durable Fields

**merchantBrowserSessions**:
- `tokenIdentifier`: Owner identity (from Firebase Auth)
- `merchantHost`: Approved merchant domain
- `engine`: `"KITESURF"` or `"CHROMIUM"` (must match actual provider)
- `status`: Current state machine state
- `providerSessionId`: Cloudflare session identifier (internal only)
- `currentUrl`: Current page URL (customer-safe)
- `pageTitle`: Current page title (customer-safe)
- `currentStep`: Semantic commerce step (customer-safe)
- `lastEventSeq`: Monotonic event sequence number
- `actionBudgetUsed`: Number of autonomous actions consumed
- `handoffReason`: Customer-safe reason for handoff
- `createdAt`: Session creation timestamp
- `updatedAt`: Last update timestamp
- `expiresAt`: Session expiry timestamp

**merchantBrowserEvents**:
- `sessionId`: Reference to parent session
- `tokenIdentifier`: Owner identity
- `sequence`: Monotonic event number
- `eventType`: Event type (customer-safe)
- `summary`: Human-readable summary (customer-safe)
- `createdAt`: Event timestamp

## Engine Selection Rules

### Kitesurf Selection Criteria

Use Kitesurf (`selectEngine(false)`) for:
- Product page extraction
- Price verification
- Currency extraction
- Public availability checks
- Public product metadata
- Quick screenshots/page understanding
- Short discovery operations
- Stateless, read-only page inspection

### Chromium Selection Criteria

Use Chromium (`selectEngine(true)`) for:
- Merchant navigation requiring continuity
- Variant selection
- Merchant cart construction
- Quantity changes
- Cart removal
- Cookies/session state persistence
- Merchant login
- Checkout preparation
- Shipping/address flows
- MFA, CAPTCHA, human takeover
- Resume after takeover
- Merchant order submission
- Merchant confirmation

### Implementation Rule

The `engine` field recorded in Convex must exactly match the browser engine actually created by the provider. A session recorded as `KITESURF` must really use Kitesurf. A session recorded as `CHROMIUM` must really use persistent Chromium.

## Agent Tools

### Autonomous Tools (Approval Class)

These tools perform reversible merchant-cart actions without explicit approval:

- `merchant_observe_cart`: Read-only page state observation
- `merchant_open_product`: Navigate to product page on approved merchant
- `merchant_add_to_cart`: Add product to merchant cart
- `merchant_update_quantity`: Change item quantity in merchant cart
- `merchant_remove_item`: Remove item from merchant cart

### Approval Tools (Approval Class)

These tools require explicit user approval before execution:

- `merchant_begin_account_flow`: Create or sign into merchant account

### Handoff Tools (Handoff Class)

These tools pause automation and request human intervention:

- `merchant_request_handoff`: Pause automation for MFA, CAPTCHA, SSO, credentials

## Tool Implementation Contract

Every mutating action must follow this semantic ordering:

1. **Authorize action**: Validate ownership, session state, domain policy, action budget
2. **Execute browser action**: Perform the actual CDP/automation operation
3. **Observe result**: Wait for merchant state change
4. **Verify postcondition**: Confirm the requested change occurred
5. **Record event/state**: Persist resulting state and event
6. **Return confirmed result**: Return only after all verification passes

### Example: merchant_add_to_cart

```
merchant_add_to_cart
    ↓
authorize action (ownership, ACTIVE status, budget)
    ↓
locate correct product/variant in merchant page
    ↓
perform browser interaction (click add to cart)
    ↓
wait for merchant state change
    ↓
re-observe merchant cart
    ↓
verify requested product + quantity present
    ↓
persist resulting state/event
    ↓
return confirmed result
```

### Example: merchant_remove_item

```
merchant_remove_item
    ↓
authorize action
    ↓
locate item in merchant cart
    ↓
perform browser interaction (click remove)
    ↓
wait for merchant state change
    ↓
re-read merchant cart
    ↓
verify product absent
    ↓
return confirmed result
```

### Example: merchant_update_quantity

```
merchant_update_quantity
    ↓
authorize action
    ↓
locate item in merchant cart
    ↓
change merchant quantity field
    ↓
re-observe merchant cart
    ↓
verify requested quantity
    ↓
return confirmed result
```

## Action Budget

- `actionBudgetUsed`: Counter of autonomous actions in a session
- Budget limit: 40 actions per session
- `consumeActionBudget()`: Guardrail and accounting mechanism
- Budget exhaustion: Returns `{ ok: false }`, does not perform action
- Budget is NOT the implementation of the merchant action itself

## Human-in-the-Loop (HITL) Takeover

### Triggers

Transition to `HANDOFF_REQUIRED` when browser encounters:
- Merchant authentication
- MFA
- CAPTCHA
- SSO
- Credential entry
- Sensitive personal information
- Unexpected checkout confirmation
- Merchant-specific verification

### Workflow

```
ACTIVE
 ↓
HANDOFF_REQUIRED
    ↓
get Live View (short-lived, customer-safe)
    ↓
initiate handoff
    ↓
surface secure interactive browser to user
    ↓
HUMAN_CONTROL
    ↓
user completes required operation
    ↓
handoff completion
    ↓
RESUMING
    ↓
re-observe browser
    ↓
ACTIVE
```

### Live View Contract

- Live View URL is short-lived by provider policy
- Issued ONLY to the authenticated session owner, for the SAME provider browser session
- Surfaced by `controlSession(TAKE_OVER)` (returns `{ ok, liveViewUrl }`) and re-fetchable via `GET /api/merchant/session/live-view?sessionId=…` while `status = HUMAN_CONTROL`
- Never persisted in Convex, never written to events, never logged
- Only normalized page facts are kept in Convex
- Provider secrets and long-lived browser credentials remain server-side
- User must return control to the same browser session; starting an unrelated browser or external merchant URL is not equivalent to handoff
- Returning control is `RESUME` → `RESUMING` → provider re-observation → `ACTIVE` (completed by `reobserveAfterResume`, never left dangling)
- `LIVE_VIEW_ISSUED` audit event records that a view was issued — never the URL itself

## Customer-Safe Events

### Event Types

- `SESSION_CREATED`: Browser session starting
- `PAGE_OPENED`: Merchant page opened
- `TOOL_OBSERVE`: Page observation
- `TOOL_OPEN_PRODUCT`: Product page navigation
- `TOOL_ADD_TO_CART`: Add to cart action
- `TOOL_UPDATE_QUANTITY`: Quantity change action
- `TOOL_REMOVE_ITEM`: Remove item action
- `TOOL_APPROVAL_BLOCKED`: Account flow blocked (no approval record)
- `BUDGET_EXHAUSTED`: Action budget reached
- `STATUS_*`: State transition events
- `LIVE_VIEW_ISSUED`: A short-lived live view was issued for HITL (no URL in the event)
- `REDIRECT_ESCAPE`: Redirect off approved domain

### Event Content

Events contain only customer-safe summaries:
- No provider URLs
- No cookies or tokens
- No DOM selectors
- No CDP commands
- No provider payloads
- No internal tool reasoning
- No implementation details

## Semantic CurrentStep Values

### Recommended Typed Steps

Use these typed semantic commerce states instead of arbitrary strings:

- `OPENING_MERCHANT`: Initial merchant page load
- `FINDING_PRODUCT`: Locating product in catalog
- `SELECTING_VARIANT`: Choosing size/color/variant
- `ADDING_TO_CART`: Adding item to merchant cart
- `VERIFYING_CART`: Confirming cart contents
- `CHECKING_DELIVERY`: Reviewing shipping options
- `ENTERING_CHECKOUT`: Beginning checkout flow
- `NEEDS_USER`: Requires human intervention
- `READY_FOR_CONFIRMATION`: Ready for user confirmation
- `SUBMITTING_ORDER`: Submitting merchant order
- `VERIFYING_ORDER`: Confirming merchant acceptance
- `COMPLETED`: Order completed successfully

### Client Translation

Translate semantic steps to user-facing copy in the Android client (`stepCopy` in `MerchantBrowserSessionCard.kt`; unknown values render as nothing, never raw internals). The `MerchantBrowserSessionCard` displays:
- Merchant host
- Current semantic step (customer copy)
- Page title when observed
- Status
- Handoff reason (when HANDOFF_REQUIRED)
- Same-session live view hint (when HUMAN_CONTROL)
- Pause/Resume/Take over controls

### Where Steps Are Written

The provider layer stamps steps during verified actions: `recordObservation(currentStep)` after navigation/cart changes, and `recordStep` from tools (`FINDING_PRODUCT` after an observed product page, `ADDING_TO_CART` before add, `VERIFYING_CART` after the merchant cart re-observation). `recordProviderStart` stamps `OPENING_MERCHANT`. Legacy string values (e.g. `observing`) are treated as unknown by the client.

## Domain Allowlisting

### Configuration

- `KITESURF_ALLOWED_DOMAINS`: Comma-separated list of approved merchant domains
- HTTPS-only: All merchant URLs must use HTTPS
- Redirect protection: Final page must stay on approved merchant host
- SSRF protection: Prevent open redirects to arbitrary domains

### Validation

- Host must be in allowlist or subdomain of allowlisted domain
- Protocol must be HTTPS
- Redirects off approved domain close session and fail
- Provider session creation validates allowlist before any navigation

## Idempotency

### Operation Idempotency

- All tool actions must be idempotent
- Duplicate tool calls should not create duplicate side effects
- Merchant state is source of truth for verification
- Action budget is consumed only once per successful operation

### Idempotency Keys

- Checkout attempts use idempotency keys to prevent duplicate charges
- Payment intents use Stripe idempotency keys
- Order creation validates payment intent not already used

## Merchant Order Submission

### Pre-Submission

- User must authorize exact-intent purchase (device signature verification)
- Merchant cart must contain verified items
- Shipping/tax/final merchant total must be confirmed
- Payment authorization must be complete

### Submission

- Submit order to merchant through browser automation
- Wait for merchant acceptance
- Capture merchant confirmation/order ID
- Verify order appears in merchant account

### Post-Submission

- Persist canonical Spresso order with merchant confirmation
- Store merchant order ID and confirmation details
- Transition to `COMPLETED` state
- Provide order confirmation to user

## Failure Semantics

### Transient Failures

- Network timeouts: Retry with exponential backoff
- Provider unavailability: Surface customer-safe error
- Browser session crash: Re-create session if budget allows

### Permanent Failures

- Redirect off approved domain: Session → FAILED
- Budget exhaustion: Session → FAILED
- Merchant rejects order: Session → FAILED
- Payment failure: Order → FAILED, provide error details

### Error Messages

All errors surfaced to users must be customer-safe:
- No provider URLs
- No internal stack traces
- No technical error codes
- No debugging information
- Clear, actionable guidance

## Reconciliation

### Payment/Merchant Reconciliation

Handle partial-failure boundaries explicitly:

- Payment authorized + merchant rejects → void/cancel authorization
- Merchant accepts + payment outcome unknown → reconciliation state
- Network failure after merchant submission → query/reconcile before retry
- Lost merchant response → never submit duplicate order

### Reconciliation States

Orders may enter reconciliation states:
- `RECONCILING`: Waiting for payment outcome
- `PARTIALLY_FULFILLED`: Merchant accepted, payment pending
- `DISPUTED`: Merchant and payment disagree

## Security Boundaries

### Zero-Trust Agent Boundary

Every tool invocation validates:
- Authenticated identity
- Authorization scope
- Origin/context
- Input schema
- Destination
- Rate/budget limits
- Replay/idempotency state

### Secret Protection

- Provider credentials in deployment env only
- Never log tokens or Live View URLs
- Normalize all provider responses before client exposure
- Client receives only customer-safe data

### Prompt Injection Resistance

- Use JSON schema responses from Kitesurf
- Validate all provider responses against schemas
- Never execute arbitrary provider output as code
- Sanitize all merchant page content before use

## Testing

### Behavioral Tests

Required behavioral tests:
- Add to Cart does not start checkout
- Cart survives abandoned checkout
- merchant_add_to_cart cannot return success until merchant cart contains item
- merchant_remove_item verifies removal
- Merchant quantity changes are re-observed
- Kitesurf session metadata matches actual Kitesurf provider invocation
- Persistent shopping sessions select Chromium
- HITL preserves the same browser session through takeover/resume
- Handoff cannot expose provider credentials
- Checkout cannot succeed without authoritative merchant/order state
- Lost merchant response does not duplicate an order
- Payment/merchant partial failure enters reconciliation
- Successful checkout reaches durable Order Confirmation

### Provider Contract Tests

Use deterministic provider adapters/contract fixtures for automated testing where live external transactions would create real side effects. Production implementations remain connected to real providers.

## Implementation References

- Convex schema: `convex/schema.ts`
- State machine: `convex/merchantBrowser/state.ts`
- Provider layer: `convex/merchantBrowser/provider.ts`
- Provider transport: `convex/merchantBrowser/cloudflare.ts`
- Agent tools: `convex/merchantBrowser/tools.ts`
- Public API: `convex/merchantBrowser/index.ts`
- Events: `convex/merchantBrowser/events.ts`
- HTTP bridge: `convex/http.ts`
- Android client: `composeApp/src/commonMain/kotlin/network/ConvexApi.kt`
- Session card: `composeApp/src/commonMain/kotlin/components/features/chat/MerchantBrowserSessionCard.kt`
- Ephemeral Kitesurf extraction: `convex/commerce/actions.ts` (`merchantQuote` → `browser-rendering/json?browser=kitesurf`)
- Android UI: `composeApp/src/commonMain/kotlin/components/features/chat/MerchantBrowserSessionCard.kt`
- Android ViewModel: `composeApp/src/commonMain/kotlin/viewmodels/MerchantBrowserViewModel.kt`