import { z } from "zod";

export const IntentNameSchema = z.enum([
  "answer",
  "discover",
  "compare",
  "try_on",
  "generate_media",
  "prepare_tool_action",
]);

const ProposedArgumentsSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Model output is deliberately strict: authorization, identity, payment, and
 * confirmation fields are not part of the model-owned contract.
 */
export const ModelIntentPlanSchema = z.object({
  intent: IntentNameSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().min(1).max(1000),
  proposedTool: z.string().trim().min(1).max(120).optional(),
  proposedArguments: ProposedArgumentsSchema,
}).strict();

export type ModelIntentPlan = z.infer<typeof ModelIntentPlanSchema>;

export const IntentPlanSchema = ModelIntentPlanSchema.transform((plan) => ({
  ...plan,
  requiresConfirmation: plan.intent === "prepare_tool_action" || plan.intent === "generate_media" || plan.intent === "try_on",
}));

export type IntentPlan = z.infer<typeof IntentPlanSchema>;
