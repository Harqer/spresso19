# Architecture contract — read only the sections required by the active phase

## Product target

Spresso's AI agent must match the applicable published Meta Muse browser/shopping capability surface: conversational multi-step browsing, arbitrary retailer navigation, site search, form filling, authenticated workflows, cart manipulation, uploads/downloads, tabs/popups/iframes, dynamic JavaScript sites, visible browser takeover, resume after user intervention, purchase preparation, critical-action approval, and audit history.

Spresso may exceed Muse security/isolation. Browser capability may not be removed merely to simplify security.

## Canonical runtime

```text
existing Convex AI agent
        ↕
Convex merchant-browser orchestration/state
        ↕
Playwright executor
        ↕
one Browserbase Chromium session per merchant workflow
        ↕
merchant
```

Convex owns durable workflow/business state. Browserbase owns ephemeral browser execution. The Browserbase `connectUrl` is a credential-bearing transport value and is never persisted in Convex events/tables. Retrieve it from Browserbase by `providerSessionId` when an executor action reconnects.

Required packages for the runtime phase:
- `@browserbasehq/sdk`
- `playwright-core`

Use `bb.sessions.create(...)`, then `chromium.connectOverCDP(session.connectUrl)`. For later action calls, use `bb.sessions.retrieve(providerSessionId)` and require a live `connectUrl`; reconnect, perform the bounded batch, then disconnect without intentionally releasing the remote session until the Spresso workflow ends.

## Per-merchant isolation

One authenticated or transaction-capable merchant workflow maps to one Browserbase session. Multi-store work uses independent sessions concurrently. Never reuse a browser between unrelated merchants in the same workflow.

No persistent Browserbase Contexts in this core pass.

## Browser capability

The executor must support:
navigation; semantic locators; DOM inspection; page.evaluate; raw trusted-broker CDP escape; mouse/keyboard; click/double click; type/fill; select/check; hover/scroll/drag; iframes; tabs/windows/popups; redirects; uploads/downloads; screenshots; accessibility observations; network observations; authenticated sessions; SPA/JavaScript-heavy pages.

Raw administrative operations that would disable Spresso policy enforcement are broker-only. This is authority separation, not a user-facing browser feature reduction.

## Latency/token contract

Prefer one reasoning turn -> one batch of dependent Playwright operations -> compact structured result. Do not return full DOM snapshots when targeted evidence suffices. Semantic/a11y observations first, DOM second, vision/coordinates only when required.

## Current repository facts to verify, not assume blindly

At the time this bundle was authored:
- `convex/merchantBrowser/tools.ts` contained synthetic success paths for open/add/update/remove.
- `convex/merchantBrowser/index.ts` selected Kitesurf for new sessions through `selectEngine(false)`.
- `convex/merchantBrowser/provider.ts` managed Cloudflare sessions but did not execute real Playwright actions.
- Stripe payment success could create a Spresso `orders` row without merchant-order evidence.
- root `package.json` did not contain Browserbase or Playwright dependencies.

Re-read current HEAD before editing; if a fact is already remediated, preserve the working implementation.

## Deferred optimization

Do not implement WebCMD, cross-task site memory, workflow caching/self-repair, or persistent browser contexts in phases 1-6. Keep boundaries extensible, but do not add placeholder abstractions solely for future caching.
