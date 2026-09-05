"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransferAuditRef = exports.AGENT_WALLET_ACCOUNT = exports.confirmAgentTransfer = exports.prepareAgentTransfer = exports.getAgentWalletStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const zod_1 = require("zod");
const db_1 = require("../shared/db");
const agentWallet_1 = require("./agentWallet");
const cdpWalletAdapter_1 = require("./cdpWalletAdapter");
/**
 * Agent wallet callables.
 *
 * prepareAgentTransfer: an agent may stage a USDC transfer for review. No
 *   funds move at this step.
 * confirmAgentTransfer: the user's explicit confirmation executes the staged
 *   transfer. The confirmed amount/destination are locked to the prepared
 *   record; CDP policy independently enforces the spend cap and recipient
 *   allowlist at signing time.
 */
function service() {
    return (0, agentWallet_1.createAgentWalletService)((0, cdpWalletAdapter_1.createCdpWalletPort)(), agentWallet_1.stablecoinContractAddress.value());
}
exports.getAgentWalletStatus = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [...cdpWalletAdapter_1.cdpWalletSecrets, agentWallet_1.stablecoinContractAddress, agentWallet_1.stablecoinSymbol], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider) === "anonymous") {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    try {
        const wallet = await service().getAccount();
        return {
            address: wallet.address,
            policyBound: Boolean(wallet.accountPolicy),
            tokenSymbol: (0, agentWallet_1.tokenSymbol)(),
            tokenDecimals: (0, agentWallet_1.tokenDecimals)(),
        };
    }
    catch (error) {
        console.error("Agent wallet status failed", { error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "The wallet service is unavailable right now.");
    }
});
exports.prepareAgentTransfer = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [...cdpWalletAdapter_1.cdpWalletSecrets, agentWallet_1.stablecoinContractAddress, agentWallet_1.stablecoinDecimals], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider) === "anonymous") {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    const input = agentWallet_1.PrepareTransferSchema.safeParse(request.data);
    if (!input.success) {
        throw new https_1.HttpsError("invalid-argument", "A valid recipient, USDC amount, and network are required.");
    }
    try {
        const prepared = await service().prepareTransfer(input.data);
        return {
            transferId: prepared.transferId,
            destinationAddress: prepared.destinationAddress,
            amountTokenBaseUnits: prepared.amountTokenBaseUnits,
            tokenSymbol: (0, agentWallet_1.tokenSymbol)(),
            tokenDecimals: (0, agentWallet_1.tokenDecimals)(),
            network: prepared.network,
            status: prepared.status,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("spend policy")) {
            throw new https_1.HttpsError("failed-precondition", "That amount is above the allowed limit for wallet transfers.");
        }
        console.error("Agent transfer preparation failed", { message });
        throw new https_1.HttpsError("internal", "We couldn't stage that transfer. Please try again.");
    }
});
exports.confirmAgentTransfer = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [...cdpWalletAdapter_1.cdpWalletSecrets, agentWallet_1.stablecoinContractAddress, agentWallet_1.stablecoinDecimals], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider) === "anonymous") {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    }
    const input = zod_1.z
        .object(Object.assign(Object.assign({}, agentWallet_1.PrepareTransferSchema.shape), { userConfirmationToken: zod_1.z.string().min(8).max(256) }))
        .strict()
        .safeParse(request.data);
    if (!input.success) {
        throw new https_1.HttpsError("invalid-argument", "Confirmation requires the prepared transfer details.");
    }
    try {
        const executed = await service().confirmAndExecuteTransfer(input.data);
        return { transferId: executed.transferId, transactionHash: executed.transactionHash, status: executed.status };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Explicit user confirmation")) {
            throw new https_1.HttpsError("failed-precondition", "Confirm the transfer in the app before it can be sent.");
        }
        if (message.includes("No prepared transfer")) {
            throw new https_1.HttpsError("failed-precondition", "This transfer is no longer awaiting confirmation.");
        }
        if (message.includes("does not match")) {
            throw new https_1.HttpsError("invalid-argument", "Confirmation details do not match the prepared transfer.");
        }
        if (message.includes("spend policy")) {
            throw new https_1.HttpsError("failed-precondition", "That amount is above the allowed limit for wallet transfers.");
        }
        console.error("Agent transfer execution failed", { message });
        throw new https_1.HttpsError("internal", "The transfer could not be completed. Please try again.");
    }
});
exports.AGENT_WALLET_ACCOUNT = agentWallet_1.AGENT_WALLET_ACCOUNT_NAME;
// Firestore listeners for wallet transfer records (audit trail lives in
// console logs; the records themselves are in the walletTransfers collection).
exports.walletTransferAuditRef = db_1.db.collection("walletTransfers");
//# sourceMappingURL=agentWalletCallables.js.map