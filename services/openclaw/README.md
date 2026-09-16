# Spresso OpenClaw service

OpenClaw tool execution boundary for the NVIDIA agent stack. Tools declared in
`tool-policy.yaml` run only inside a NemoClaw/OpenShell sandbox whose baseline
network and filesystem policy lives in
`nemoclaw-blueprint/policies/openclaw-sandbox.yaml`.

## Trust boundaries

- **Orchestration authority:** `functions/src/ai/orchestration/agentOrchestrator.ts`
  owns identity, budgets, guardrail ordering, and one-time confirmation tokens.
  Tools in this service never self-authorize.
- **Sandbox containment:** NemoClaw/OpenShell enforces deny-by-default network
  egress (only `integrate.api.nvidia.com`, managed inference, ClawHub, OpenClaw
  API/docs, npm registry) and a bounded filesystem (`/sandbox`, `/tmp` writable;
  `/usr`, `/etc`, `/proc` read-only) under Landlock + seccomp + netns.
- **Credential hygiene:** raw provider keys never enter the sandbox; OpenShell's
  gateway injects them at its L7 proxy at egress time.
- **No purchase path:** no tool can submit payment, sign transactions, enter
  credentials, or claim purchase completion. `prepare_cart` and
  `request_checkout_confirmation` require a trusted-UI confirmation token, and
  final purchase remains exclusively in the trusted UI.

## Verification

```bash
pytest -q services/openclaw/tests/policy_test.py
```

The tests assert the verified NemoClaw schema shape, absence of public-web and
GitHub egress in the baseline, the exact tool allowlist, and credential
redaction. NemoClaw/OpenShell itself is not installed here; these files are the
policy source applied through `nemoclaw onboard` per NVIDIA's documented
workflows.
