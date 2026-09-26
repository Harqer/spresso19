---
name: spresso-browser-phase-4-security
description: Implement and adversarially verify the Muse-derived browser security plane: per-merchant containment, forced egress/SSRF controls, prompt-injection defense, PII policy, malicious-site checks, and download quarantine.
schedule: "Run only after PHASE-3-DONE.md exists, PHASE-4-DONE.md and PHASE-4-BLOCKED.md are absent, and Noodle mode is supervised or manual."
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

# Phase 4 — browser security plane

AUTO MODE IS FORBIDDEN FOR THIS PHASE.

## Nested skills

Load `convex:convex-expert` for Convex policy/state changes and `convex:convex-reviewer` before completion.

Browserbase `safe-browser` is a reference only; do not adopt its static allowlist/Claude-Agent architecture or reduce Spresso browser capability.

## Goal

Assume a merchant page can successfully prompt-inject the agent. Constrain the blast radius without removing normal browser functionality.

Required property:

```text
compromised merchant browser
≠ another merchant session
≠ backend/admin secrets
≠ payment authority
≠ unrestricted network egress
```

## External egress boundary

Browserbase session creation must route traffic through a Spresso-controlled forward proxy/gateway using Browserbase external proxy configuration with a catch-all domain pattern.

The gateway is security infrastructure, not commerce authority.

Implement task-scoped proxy credentials:
- random high-entropy session token;
- bound to merchantSessionId/taskId;
- TTL <= browser session TTL;
- revoked at session termination.

Gateway checks CONNECT/HTTP destination before forwarding:
- DNS resolution under gateway control;
- deny loopback, link-local, RFC1918/private, CGNAT, multicast, cloud metadata, Spresso internal service ranges;
- deny unexpected ports;
- re-resolve/re-evaluate redirects/new connections;
- log only redacted destination/policy metadata.

No browser or model operation can change gateway policy or proxy credentials.

## L7 browser policy

Because an ordinary CONNECT proxy cannot see HTTPS path/body, enforce L7 policy inside the trusted Playwright broker before requests leave Chromium:
- attach routing/request/websocket hooks to every page/context;
- cover new pages, frames and workers;
- inspect destination URL, method and sensitive data classification;
- do not expose policy-disable APIs through the model-facing CDP escape operation.

Security tests must probe service-worker, WebSocket, DNS-rebinding, WebRTC and QUIC paths. If Browserbase cannot force all browser egress through the proxy, create `PHASE-4-BLOCKED.md` with the observed bypass and do not claim production containment. The approved fallback architecture is the same Playwright broker inside a Spresso-controlled Firecracker microVM with host-enforced egress.

## SSRF

Block at both gateway and broker:
- localhost/loopback;
- private/link-local ranges after DNS resolution;
- metadata endpoints;
- redirects that resolve to blocked ranges;
- alternate numeric/IPv6 encodings;
- DNS rebinding between checks/connect.

## Prompt injection

Primary defense is containment. Add independent detection as defense-in-depth.

Text/DOM/a11y classifier:
- Meta Llama Prompt Guard 2 86M or the current direct successor if primary docs mark it deprecated;
- isolated classifier call/process with no tools/browser authority;
- chunk bounded input;
- calibrate threshold on a checked-in Spresso browser corpus rather than accepting a default.

Scan content that is about to influence planning/action:
- relevant visible text;
- DOM/a11y text;
- textual downloads;
- extracted text from visually suspicious content when vision is used.

Outcomes:
`BENIGN`, `SUSPICIOUS`, `MALICIOUS`.
Suspicious gates sensitive writes for user review; malicious blocks the implicated action.

## Malicious URL reputation

Use Google Web Risk Update API/local threat lists for low-latency navigation checks. Check initial navigation and redirects. Reputation absence never means trusted.

## Sensitive-data policy

Classify values:
`PUBLIC`, `USER_PII`, `AUTH_SECRET`, `PAYMENT_SECRET`.

AUTH_SECRET/PAYMENT_SECRET never enter agent context.

USER_PII submission is allowed only when:
- active task purpose requires it;
- target origin is merchant/necessary checkout/auth dependency;
- form/field semantics match the purpose.
Unexpected new origin or mismatched purpose requires review/block.

Redact secrets from browser results, logs, event summaries and exceptions.

## Downloads

Quarantine before agent consumption:
- byte/size limit;
- magic/MIME verification;
- decompression/archive limits;
- ClamAV or equivalent malware scan;
- safe parser/extractor;
- prompt-injection scan on extracted text.
Never execute downloaded content.

## Session recording privacy

Disable Browserbase session recording where the current API allows it for sensitive workflows. If platform recording cannot be disabled, verify credential/payment takeover content is excluded/redacted by provider guarantees; otherwise block production secret entry through that path and document the requirement.

## Adversarial tests

Prove:
- cross-merchant isolation;
- backend env secrets absent from browser;
- private-IP/metadata access blocked;
- HTTP/HTTPS exfil blocked;
- WebSocket/service-worker bypass blocked;
- DNS rebinding blocked;
- WebRTC/QUIC cannot evade policy;
- model cannot disable routing/security hooks;
- prompt injection cannot access payment/backend authority;
- PII exfil to unrelated origin blocked/reviewed;
- download injection quarantined;
- Live View secrets absent from Convex/logs.

## Completion

Write `PHASE-4-DONE.md` only after the forced-egress bypass suite passes. A real provider/network limitation is a BLOCKED condition, not something to paper over.
