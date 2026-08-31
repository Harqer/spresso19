# Discovery and Merchant Routing Production Design

## Goal

Make Spresso a production-safe product discovery and merchant-routing app. Spresso discovers listings through research providers, preserves provider evidence, stores user intent in the cart, verifies merchant data at the boundary, and sends the user to complete checkout until an approved merchant payment integration exists.

## Product boundary

Spresso does not own retailer inventory. Firestore stores user-scoped operational state and may cache normalized discovery results. It does not become a universal product database. Merchant price and availability remain provider or merchant facts that must be checked near checkout.

Agents may search, normalize, rank, verify, and stage a merchant page. Agents may not submit an order, enter payment credentials, move funds, sign a wallet transaction, or claim purchase success. The current checkout action opens the verified merchant listing for user completion.

## Canonical listing contract

All discovery providers produce the same `DiscoveredListing` shape:

```ts
type DiscoveredListing = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  merchantUrl: string;
  source: "parallel" | "serpapi" | "apify" | "kitesurf";
  providerListingId?: string;
  observedPrice?: {
    amount: number;
    currency: string;
    evidenceUrl: string;
  };
  discoveredAt: string;
  expiresAt?: string;
  confidence?: number;
};
```

Provider adapters must validate external data before constructing this type. Model output must be treated as untrusted. A listing is rejected when its merchant URL or price evidence is not present in the supplied provider result. Unknown prices stay unknown. They are never converted to zero.

IDs use a stable provider and canonical URL derivation. They must not depend on timestamps.

## Discovery flow

1. The client sends a natural-language query and optional location context to the discovery callable.
2. The callable invokes configured research providers with bounded queries and budgets.
3. Provider adapters validate and normalize results.
4. Gemini may rank or summarize only the validated result set.
5. The server verifies every model-selected URL and evidence field against the validated inputs.
6. The callable returns `DiscoveredListing` records.
7. Firestore may cache normalized results with provider timestamps and expiry.

The client never calls a local product inventory endpoint. All surfaces consume the same discovery contract through a shared repository.

## Cart and quote flow

The cart stores user intent and a listing snapshot:

- listing ID
- product name
- merchant URL
- provider source
- provider listing ID when available
- observed price and currency when available
- observation timestamp
- quantity

Adding an item to the cart does not reserve stock or establish a final price. Before any future in-app payment flow, a server-owned quote boundary must re-query a trusted merchant or provider, validate currency and expiry, and calculate the processor amount. The client must not send `unitPrice` as an authority.

Until an approved merchant payment integration exists, Spresso does not create a Stripe payment intent for merchant checkout. The user completes the order on the merchant site. Stripe remains reserved for approved Spresso-controlled financial flows and future server-owned quotes.

## Kitesurf boundary

Kitesurf handles short-lived browser tasks against allowlisted HTTPS domains. It may verify a public listing, extract structured merchant data, capture a staging screenshot, and navigate to checkout. It must stop before order submission, payment submission, account changes, or security changes.

The Kitesurf adapter returns a structured staging result with the final URL, observed merchant data, completed steps, and a typed failure reason. Merchant-specific selectors live in adapters. The generic adapter does not claim that a page supports checkout.

Pages that require persistent authentication, bot-challenge workarounds, unsupported payment forms, or non-HTML interaction are marked incompatible and routed to user-completed checkout. Browser sessions use domain allowlists, HTTPS-only navigation, bounded timeouts, request limits, and redacted action logs.

## Shared client behavior

Web and Android use the canonical listing contract. Catalog, chat, vision, wardrobe, cart, and checkout screens consume the same repository and cache rules. Discovery requests are debounced and cancellable. Empty prices display an unknown-price state. Provider names and backend errors do not appear in customer-facing copy.

The unused `fetchProductsByIds` callable is removed unless a concrete listing-normalization use case requires a new endpoint with a different name and contract.

## Android requirements

The common Kotlin layer mirrors the listing contract and callable envelope. Android uses the same discovery and cart state rules as web. The passkey flow uses a real platform credential adapter. Biometric success authorizes a user action but does not create an order or payment success state.

## Infrastructure requirements

Terraform and Firebase function declarations must cover every active secret and callable dependency. The audit must verify Parallel, SerpAPI, Apify, Gemini, Stripe, and Cloudflare credentials by function. Deployment checks must verify the actual `get-spresso` project services rather than infer readiness from project existence.

Legacy Cloud SQL and Redis resources remain out of the launch path unless a separate approved requirement enables them.

## Verification requirements

The release gate requires:

- provider contract tests
- provenance rejection tests
- no-synthetic-success tests
- cart and quote boundary tests
- Kitesurf safety and incompatibility tests
- deployed endpoint smoke checks
- strict mock scanning
- web lint and production build
- web bundle and tree-shaking checks
- Functions type checking and tests
- Android compile, lint, and unit tests
- GitNexus impact analysis before edits and change analysis before commits

Cloud credentials and external deployment state must be reported separately from repository test results.

## Parallel delivery model

The contract, state machine, and failing fixtures land first. Independent workstreams then implement discovery, cart and payment boundaries, Kitesurf staging, infrastructure checks, client state, Android support, and verification. Integration starts only after each workstream passes its local tests and conforms to the canonical contract.
