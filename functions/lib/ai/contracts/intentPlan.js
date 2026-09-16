"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentPlanSchema = exports.ModelIntentPlanSchema = exports.IntentNameSchema = void 0;
const zod_1 = require("zod");
exports.IntentNameSchema = zod_1.z.enum([
    "answer",
    "discover",
    "compare",
    "try_on",
    "generate_media",
    "prepare_tool_action",
]);
const ProposedArgumentsSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional();
/**
 * Model output is deliberately strict: authorization, identity, payment, and
 * confirmation fields are not part of the model-owned contract.
 */
exports.ModelIntentPlanSchema = zod_1.z.object({
    intent: exports.IntentNameSchema,
    confidence: zod_1.z.number().min(0).max(1),
    rationale: zod_1.z.string().trim().min(1).max(1000),
    proposedTool: zod_1.z.string().trim().min(1).max(120).optional(),
    proposedArguments: ProposedArgumentsSchema,
}).strict();
exports.IntentPlanSchema = exports.ModelIntentPlanSchema.transform((plan) => (Object.assign(Object.assign({}, plan), { requiresConfirmation: plan.intent === "prepare_tool_action" || plan.intent === "generate_media" || plan.intent === "try_on" })));
//# sourceMappingURL=intentPlan.js.map