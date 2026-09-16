"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardrailsServiceError = void 0;
exports.validateInput = validateInput;
exports.validateToolCall = validateToolCall;
exports.validateToolResult = validateToolResult;
const zod_1 = require("zod");
const ReasonSchema = zod_1.z.enum(["content", "jailbreak", "topic", "pii", "tool", "schema", "service_error"]);
const DecisionSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    reason: ReasonSchema.optional(),
}).strict().superRefine((value, context) => {
    if (value.allowed && value.reason !== undefined)
        context.addIssue({ code: "custom", message: "Allowed decisions cannot carry a denial reason." });
    if (!value.allowed && value.reason === undefined)
        context.addIssue({ code: "custom", message: "Denied decisions require a reason." });
});
class GuardrailsServiceError extends Error {
    constructor(decision = { allowed: false, reason: "service_error" }) {
        super("Guardrails service denied the request.");
        this.name = "GuardrailsServiceError";
        this.decision = decision;
    }
}
exports.GuardrailsServiceError = GuardrailsServiceError;
function serviceUrl() {
    var _a;
    const value = (_a = process.env.NEMO_GUARDRAILS_URL) === null || _a === void 0 ? void 0 : _a.trim();
    if (!value)
        throw new GuardrailsServiceError();
    let url;
    try {
        url = new URL(value);
    }
    catch (_b) {
        throw new GuardrailsServiceError();
    }
    if (url.protocol !== "https:")
        throw new GuardrailsServiceError();
    return url.toString().replace(/\/$/, "");
}
function validateCommon(correlationId) {
    if (typeof correlationId !== "string" || correlationId.trim().length < 1 || correlationId.length > 200)
        throw new GuardrailsServiceError();
}
async function request(path, body) {
    let response;
    try {
        response = await fetch(`${serviceUrl()}${path}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        });
    }
    catch (_a) {
        throw new GuardrailsServiceError();
    }
    if (!response.ok)
        throw new GuardrailsServiceError();
    const parsed = DecisionSchema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success)
        throw new GuardrailsServiceError();
    return parsed.data;
}
async function validateInput(input) {
    validateCommon(input.correlationId);
    if (typeof input.prompt !== "string" || input.prompt.trim().length < 1 || input.prompt.length > 4000)
        throw new GuardrailsServiceError();
    return request("/v1/validate/input", { correlationId: input.correlationId, prompt: input.prompt });
}
async function validateToolCall(input) {
    validateCommon(input.correlationId);
    if (typeof input.toolName !== "string" || input.toolName.trim().length < 1 || input.toolName.length > 120 || !input.arguments || typeof input.arguments !== "object" || Array.isArray(input.arguments))
        throw new GuardrailsServiceError();
    return request("/v1/validate/tool-call", input);
}
async function validateToolResult(input) {
    validateCommon(input.correlationId);
    if (typeof input.toolCallId !== "string" || input.toolCallId.trim().length < 1 || input.toolCallId.length > 200 || typeof input.toolName !== "string" || input.toolName.trim().length < 1 || input.toolName.length > 120 || typeof input.content !== "string" || input.content.length > 100000)
        throw new GuardrailsServiceError();
    return request("/v1/validate/tool-result", input);
}
//# sourceMappingURL=guardrailsClient.js.map