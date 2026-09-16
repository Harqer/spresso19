import assert from "node:assert/strict";
import test from "node:test";
import { AgentOrchestrator, OrchestrationError, type OrchestrationDependencies } from "../src/ai/orchestration/agentOrchestrator";

const plan = { intent: "prepare_tool_action" as const, confidence: 0.9, rationale: "stage item", proposedTool: "prepare_cart", proposedArguments: { listingId: "l-1" }, requiresConfirmation: true };
function deps(overrides: Partial<OrchestrationDependencies> = {}): OrchestrationDependencies {
  return {
    classify: async () => plan,
    validateInput: async () => ({ allowed: true }),
    validateToolCall: async () => ({ allowed: true }),
    consumeBudget: async () => undefined,
    issueConfirmation: async (uid, action, correlationId) => ({ token: `${uid}:${action}:${correlationId}`, action, correlationId, expiresAt: Date.now() + 60_000 }),
    consumeConfirmation: async () => true,
    executeTool: async () => ({ summary: "cart staged" }),
    ...overrides,
  };
}

test("requires an authenticated uid and validates input before classification", async () => {
  await assert.rejects(new AgentOrchestrator(deps()).handle({ uid: "", prompt: "stage", correlationId: "c-1" }), OrchestrationError);
  const order: string[] = [];
  const result = await new AgentOrchestrator(deps({ validateInput: async () => { order.push("input"); return { allowed: true }; }, classify: async () => { order.push("classify"); return { intent: "answer", confidence: 1, rationale: "answer", requiresConfirmation: false }; } })).handle({ uid: "u-1", prompt: "hello", correlationId: "c-1" });
  assert.deepEqual(order, ["input", "classify"]);
  assert.equal(result.pendingConfirmation, undefined);
});

test("does not execute consequential tools until confirmation and rejects replay", async () => {
  let executions = 0;
  const orchestrator = new AgentOrchestrator(deps({ executeTool: async () => { executions += 1; return { summary: "staged" }; } }));
  const pending = await orchestrator.handle({ uid: "u-1", prompt: "stage", correlationId: "c-1" });
  assert.equal(executions, 0);
  assert.ok(pending.pendingConfirmation);
  const confirmed = await orchestrator.handle({ uid: "u-1", prompt: "stage", correlationId: "c-1", confirmationToken: pending.pendingConfirmation!.token });
  assert.equal(confirmed.response, "staged");
  assert.equal(executions, 1);
  await assert.rejects(orchestrator.handle({ uid: "u-1", prompt: "stage", correlationId: "c-1", confirmationToken: pending.pendingConfirmation!.token }), OrchestrationError);
});

test("denies payment, wallet, inventory mutation, and shell tools even when proposed by the model", async () => {
  for (const proposedTool of ["stripe_charge", "wallet_sign", "delete_inventory", "shell_exec"]) {
    const orchestrator = new AgentOrchestrator(deps({ classify: async () => ({ ...plan, proposedTool, requiresConfirmation: false }) }));
    await assert.rejects(orchestrator.handle({ uid: "u-1", prompt: "do it", correlationId: `c-${proposedTool}` }), (error: unknown) => error instanceof OrchestrationError && error.code === "denied");
  }
});
