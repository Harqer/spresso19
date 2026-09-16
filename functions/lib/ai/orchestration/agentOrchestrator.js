"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = exports.OrchestrationError = void 0;
const zod_1 = require("zod");
const RequestSchema = zod_1.z.object({
    uid: zod_1.z.string().trim().min(1).max(200),
    prompt: zod_1.z.string().trim().min(1).max(4000),
    media: zod_1.z.array(zod_1.z.string().url().refine((value) => value.startsWith("https://"))).max(4).optional(),
    confirmationToken: zod_1.z.string().trim().min(1).max(1000).optional(),
    correlationId: zod_1.z.string().trim().min(1).max(200),
}).strict();
const DENIED_TOOLS = new Set(["stripe_charge", "wallet_sign", "delete_inventory", "shell_exec", "submit_payment", "enter_credentials"]);
const ALLOWED_TOOLS = new Set(["search_products", "read_product_page", "prepare_cart", "request_checkout_confirmation"]);
class OrchestrationError extends Error {
    constructor(code, message = "The assistant could not safely complete that request.") {
        super(message);
        this.name = "OrchestrationError";
        this.code = code;
    }
}
exports.OrchestrationError = OrchestrationError;
function safeDecision(decision) {
    if (!decision.allowed)
        throw new OrchestrationError("denied");
}
function assertToolAllowed(toolName) {
    if (!toolName || DENIED_TOOLS.has(toolName) || !ALLOWED_TOOLS.has(toolName))
        throw new OrchestrationError("denied");
}
class AgentOrchestrator {
    constructor(dependencies) {
        this.consumedConfirmations = new Set();
        this.dependencies = dependencies;
    }
    async handle(rawRequest) {
        var _a;
        const request = RequestSchema.safeParse(rawRequest);
        if (!request.success)
            throw new OrchestrationError("invalid");
        const data = request.data;
        safeDecision(await this.dependencies.validateInput({ correlationId: data.correlationId, prompt: data.prompt }));
        await this.dependencies.consumeBudget(data.uid);
        let plan;
        try {
            plan = await this.dependencies.classify({ uid: data.uid, prompt: data.prompt, imageUrls: data.media });
        }
        catch (_b) {
            throw new OrchestrationError("service_error");
        }
        if (plan.intent !== "prepare_tool_action")
            return { response: plan.rationale, plan };
        assertToolAllowed(plan.proposedTool);
        const argumentsValue = (_a = plan.proposedArguments) !== null && _a !== void 0 ? _a : {};
        safeDecision(await this.dependencies.validateToolCall({ correlationId: data.correlationId, toolName: plan.proposedTool, arguments: argumentsValue }));
        if (!data.confirmationToken) {
            const pendingConfirmation = await this.dependencies.issueConfirmation(data.uid, plan.proposedTool, data.correlationId);
            return { response: "Confirmation is required before I prepare that action.", plan, pendingConfirmation };
        }
        const confirmationKey = `${data.uid}:${data.correlationId}:${data.confirmationToken}`;
        if (this.consumedConfirmations.has(confirmationKey))
            throw new OrchestrationError("confirmation_required");
        const consumed = await this.dependencies.consumeConfirmation(data.confirmationToken, data.uid, data.correlationId);
        if (!consumed)
            throw new OrchestrationError("confirmation_required");
        this.consumedConfirmations.add(confirmationKey);
        const result = await this.dependencies.executeTool(plan.proposedTool, argumentsValue, { uid: data.uid, correlationId: data.correlationId });
        if (!result || typeof result.summary !== "string" || result.summary.length > 2000)
            throw new OrchestrationError("service_error");
        return { response: result.summary, plan };
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=agentOrchestrator.js.map