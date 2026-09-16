import { z } from "zod";

const ReasonSchema = z.enum(["content", "jailbreak", "topic", "pii", "tool", "schema", "service_error"]);
const DecisionSchema = z.object({
  allowed: z.boolean(),
  reason: ReasonSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.allowed && value.reason !== undefined) context.addIssue({ code: "custom", message: "Allowed decisions cannot carry a denial reason." });
  if (!value.allowed && value.reason === undefined) context.addIssue({ code: "custom", message: "Denied decisions require a reason." });
});

export type GuardrailsDecision = z.infer<typeof DecisionSchema>;
export type GuardrailsRequest = { correlationId: string; prompt: string };
export type ToolCall = { correlationId: string; toolName: string; arguments: Record<string, unknown> };
export type ToolResult = { correlationId: string; toolCallId: string; toolName: string; content: string };

export class GuardrailsServiceError extends Error {
  readonly decision: GuardrailsDecision;

  constructor(decision: GuardrailsDecision = { allowed: false, reason: "service_error" }) {
    super("Guardrails service denied the request.");
    this.name = "GuardrailsServiceError";
    this.decision = decision;
  }
}

function serviceUrl(): string {
  const value = process.env.NEMO_GUARDRAILS_URL?.trim();
  if (!value) throw new GuardrailsServiceError();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GuardrailsServiceError();
  }
  if (url.protocol !== "https:") throw new GuardrailsServiceError();
  return url.toString().replace(/\/$/, "");
}

function validateCommon(correlationId: string): void {
  if (typeof correlationId !== "string" || correlationId.trim().length < 1 || correlationId.length > 200) throw new GuardrailsServiceError();
}

async function request(path: string, body: unknown): Promise<GuardrailsDecision> {
  let response: Response;
  try {
    response = await fetch(`${serviceUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new GuardrailsServiceError();
  }
  if (!response.ok) throw new GuardrailsServiceError();
  const parsed = DecisionSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) throw new GuardrailsServiceError();
  return parsed.data;
}

export async function validateInput(input: GuardrailsRequest): Promise<GuardrailsDecision> {
  validateCommon(input.correlationId);
  if (typeof input.prompt !== "string" || input.prompt.trim().length < 1 || input.prompt.length > 4_000) throw new GuardrailsServiceError();
  return request("/v1/validate/input", { correlationId: input.correlationId, prompt: input.prompt });
}

export async function validateToolCall(input: ToolCall): Promise<GuardrailsDecision> {
  validateCommon(input.correlationId);
  if (typeof input.toolName !== "string" || input.toolName.trim().length < 1 || input.toolName.length > 120 || !input.arguments || typeof input.arguments !== "object" || Array.isArray(input.arguments)) throw new GuardrailsServiceError();
  return request("/v1/validate/tool-call", input);
}

export async function validateToolResult(input: ToolResult): Promise<GuardrailsDecision> {
  validateCommon(input.correlationId);
  if (typeof input.toolCallId !== "string" || input.toolCallId.trim().length < 1 || input.toolCallId.length > 200 || typeof input.toolName !== "string" || input.toolName.trim().length < 1 || input.toolName.length > 120 || typeof input.content !== "string" || input.content.length > 100_000) throw new GuardrailsServiceError();
  return request("/v1/validate/tool-result", input);
}
