---
name: spresso-browser-phase-3-experience
description: Implement Muse-like conversational browser task UX for KMP/Jetpack Compose, ordinary user-input resume, Live View authentication/MFA/CAPTCHA takeover, and exclusive agent/user control.
schedule: "Run only after PHASE-2-DONE.md exists and PHASE-3-DONE.md and PHASE-3-BLOCKED.md are absent."
---

# Operating rules

Read before work:
- `.agents/skills/spresso-browser-orchestrator/references/architecture-contract.md`
- `.agents/skills/spresso-browser-orchestrator/references/nested-skills.md`
- `.agents/skills/spresso-browser-orchestrator/references/repo-paths.md`
- `.agents/skills/spresso-browser-orchestrator/references/phase-markers.md`

Work against current HEAD. Search call sites before replacing exports. Preserve working canonical paths and remove duplication rather than adding a parallel subsystem.

Use repository evidence and tests. Do not ask the user for information derivable from the codebase or primary docs.

If `.noodle.toml` is `auto` and this phase explicitly forbids auto, stop without code changes and create the phase BLOCKED marker requesting `supervised` or `manual`.

# Phase 3 — conversational KMP/Compose experience and takeover

## Nested skills

Load `convex:convex-expert` for backend HTTP/actions and `convex:convex-reviewer` before completion.

If `kotlin-tooling-agp9-migration` is installed, read it only if build/module changes are required. Preserve a working AGP 9 KMP topology.

## Goal

Make the live browser task behave like Muse: the agent continues the same conversation while the browser works; ordinary missing information is asked conversationally; passwords/MFA/CAPTCHA use direct human control of the live browser; user and agent never control it simultaneously.

No stored cookie/profile auth in this pass.

## Backend state/API

Expose the Phase-1 states through the existing KMP HTTP/Convex transport rather than creating a new backend.

Required public owner-scoped operations:
- start merchant task/session;
- read current session;
- read events after sequence;
- submit ordinary user answer tied to `taskId/sessionId/requestId`;
- request takeover;
- acquire Live View handoff;
- report user handoff complete;
- resume after server verifies live browser state;
- cancel/close session.

All public functions derive identity from auth; clients never supply owner identity.

Ordinary user input is stored/used only as required by the active task. Do not treat password/OTP/card data as ordinary input.

## Sensitive authentication path

In this core pass, implement passwords, passkeys, OTPs, CAPTCHA and similar secrets/challenges through **Live View human takeover**, not through chat and not through a new credential vault.

Flow:

```text
agent/browser detects authentication challenge
→ state HANDOFF_REQUIRED
→ KMP presents merchant + reason
→ user accepts
→ backend obtains Browserbase debug/live URL
→ state HUMAN_CONTROL, controlOwner USER
→ Android displays the live Browserbase session
→ agent/browser write operations are rejected
→ user enters password/MFA/CAPTCHA directly in the live browser
→ user presses Done
→ backend revokes user lease, reconnects with Playwright
→ fresh URL/DOM/a11y observation verifies progress/auth state
→ state RESUMING then ACTIVE
```

The Live View URL is sensitive:
- short-lived/in-memory in client state;
- no analytics/logging;
- no SavedStateHandle persistence;
- no deep-link exposure;
- clear when handoff ends.

## Jetpack Compose/KMP implementation

Inspect current `MerchantBrowserViewModel` and related UI before changes.

Use immutable UI state with explicit representations for:
- running;
- waiting for ordinary answer;
- takeover required;
- human control;
- resuming;
- ready for purchase authorization;
- failure/completion.

Use `viewModelScope` and structured coroutines. Preserve existing transport/auth infrastructure.

For Android, add a platform-specific Live View host behind the existing KMP architecture:
- prefer an in-app Android `WebView`/`AndroidView` wrapper when Browserbase Live View supports it;
- configure it only for the Browserbase Live View origin;
- disable file/content access not needed by the viewer;
- clear WebView state when session ends;
- fall back to Android Custom Tabs if Browserbase/CSP prevents embedded Live View.
Represent this behind a common platform interface so `commonMain` does not import Android classes.

For Wasm/web, open the Browserbase Live View using the existing web platform mechanism with the same single-control lease; do not share it with the AI executor concurrently.

## Conversational user input

When the browser needs non-secret data:
- create a typed `NEEDS_USER_INPUT` request with requestId, field purpose, merchant, and validation requirements;
- agent asks naturally in the existing chat thread;
- client sends response tied to requestId;
- server validates it and resumes the exact existing browser session.

Examples: email, shipping address, phone, shoe size, delivery preference.

Never ask for password, OTP, recovery code, raw card number, cookie, or auth token in chat.

## Single-control invariant

Every browser write action checks `controlOwner === AGENT`.

Takeover atomically transitions to USER before returning Live View.

Resume requires:
- user completion signal;
- current browser observation;
- expected state verification;
- atomic transition back to AGENT.

## Tests

Kotlin/Convex tests:
- waiting ordinary input -> answer -> same session resumes;
- takeover URL only returned to owner;
- no agent writes during HUMAN_CONTROL;
- no simultaneous user/agent lease;
- stale requestId/handoff completion rejected;
- Live View URL absent from persistent state/log events;
- resume always performs fresh observation;
- cancellation releases browser session.

Run AGP 9/KMP build and relevant Android lint/tests. Do not restructure modules unless existing structure fails current AGP 9 constraints.

## Completion

Write `PHASE-3-DONE.md` only after conversational pause/resume and real Browserbase human takeover work end-to-end.
