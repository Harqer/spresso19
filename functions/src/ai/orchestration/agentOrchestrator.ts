import { z } from "zod";
import type { IntentPlan } from "../contracts/intentPlan";
import type { GuardrailsDecision, ToolCall } from "../guardrailsClient";

const RequestSchema = z.object({
  uid: z.string().trim().min(1).max(200),
  prompt: z.string().trim().min(1).max(4_000),
  media: z.array(z.string().url().refine((value) => value.startsWith("https://"))).max(4).optional(),
  confirmationToken: z.string().trim().min(1).max(1_000).optional(),
  correlationId: z.string().trim().min(1).max(200),
}).strict();

const DENIED_TOOLS = new Set(["stripe_charge", "wallet_sign", "delete_inventory", "shell_exec", "submit_payment", "enter_credentials"]);
const ALLOWED_TOOLS = new Set(["search_products", "read_product_page", "prepare_cart", "request_checkout_confirmation"]);

export type AgentRequest = z.infer<typeof RequestSchema>;
export type Confirmation = { token: string; action: string; correlationId: string; expiresAt: number };

export type OrchestrationDependencies = {
  classify(request: { uid: string; prompt: string; imageUrls?: string[]; videoUrls?: string[] }): Promise<IntentPlan>;
  validateInput(request: { correlationId: string; prompt: string }): Promise<GuardrailsDecision>;
  validateToolCall(call: ToolCall): Promise<GuardrailsDecision>;
  consumeBudget(uid: string): Promise<void>;
  issueConfirmation(uid: string, action: string, correlationId: string): Promise<Confirmation>;
  consumeConfirmation(token: string, uid: string, correlationId: string): Promise<boolean>;
  executeTool(toolName: string, argumentsValue: Record<string, unknown>, context: { uid: string; correlationId: string }): Promise<{ summary: string }>;
};

export class OrchestrationError extends Error {
  readonly code: "unauthenticated" | "denied" | "confirmation_required" | "invalid" | "service_error";

  constructor(code: OrchestrationError["code"], message = "The assistant could not safely complete that request.") {
    super(message);
    this.name = "OrchestrationError";
    this.code = code;
  }
}

function safeDecision(decision: GuardrailsDecision): void {
  if (!decision.allowed) throw new OrchestrationError("denied");
}

function assertToolAllowed(toolName: string | undefined): asserts toolName is string {
  if (!toolName || DENIED_TOOLS.has(toolName) || !ALLOWED_TOOLS.has(toolName)) throw new OrchestrationError("denied");
}

export class AgentOrchestrator {
  private readonly dependencies: OrchestrationDependencies;
  private readonly consumedConfirmations = new Set<string>();

  constructor(dependencies: OrchestrationDependencies) {
    this.dependencies = dependencies;
  }

  async handle(rawRequest: AgentRequest): Promise<{ response: string; plan: IntentPlan; pendingConfirmation?: Confirmation }> {
    const request = RequestSchema.safeParse(rawRequest);
    if (!request.success) throw new OrchestrationError("invalid");
    const data = request.data;
    safeDecision(await this.dependencies.validateInput({ correlationId: data.correlationId, prompt: data.prompt }));
    await this.dependencies.consumeBudget(data.uid);
    let plan: IntentPlan;
    try {
      plan = await this.dependencies.classify({ uid: data.uid, prompt: data.prompt, imageUrls: data.media });
    } catch {
      throw new OrchestrationError("service_error");
    }
    if (plan.intent !== "prepare_tool_action") return { response: plan.rationale, plan };
    assertToolAllowed(plan.proposedTool);
    const argumentsValue = plan.proposedArguments ?? {};
    safeDecision(await this.dependencies.validateToolCall({ correlationId: data.correlationId, toolName: plan.proposedTool, arguments: argumentsValue }));
    if (!data.confirmationToken) {
      const pendingConfirmation = await this.dependencies.issueConfirmation(data.uid, plan.proposedTool, data.correlationId);
      return { response: "Confirmation is required before I prepare that action.", plan, pendingConfirmation };
    }
    const confirmationKey = `${data.uid}:${data.correlationId}:${data.confirmationToken}`;
    if (this.consumedConfirmations.has(confirmationKey)) throw new OrchestrationError("confirmation_required");
    const consumed = await this.dependencies.consumeConfirmation(data.confirmationToken, data.uid, data.correlationId);
    if (!consumed) throw new OrchestrationError("confirmation_required");
    this.consumedConfirmations.add(confirmationKey);
    const result = await this.dependencies.executeTool(plan.proposedTool, argumentsValue, { uid: data.uid, correlationId: data.correlationId });
    if (!result || typeof result.summary !== "string" || result.summary.length > 2_000) throw new OrchestrationError("service_error");
    return { response: result.summary, plan };
  }
}
