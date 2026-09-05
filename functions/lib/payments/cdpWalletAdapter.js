"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdpWalletSecrets = exports.cdpWalletSecret = exports.cdpApiKeySecret = exports.cdpApiKeyId = void 0;
exports.createCdpWalletPort = createCdpWalletPort;
const cdp_sdk_1 = require("@coinbase/cdp-sdk");
const viem_1 = require("viem");
const params_1 = require("firebase-functions/params");
/**
 * Production adapter over the CDP SDK. Secrets come from Secret Manager via
 * Firebase function bindings; they are never logged or returned to clients.
 * Private keys stay inside CDP's TEE at all times — this adapter only ever
 * holds API identifiers.
 *
 * Token transfers are plain ERC-20 `transfer` calls (per the official
 * "Send USDC" pattern, generalized to any token contract): the calldata is
 * ABI-encoded with viem and submitted through cdp.evm.sendTransaction, which
 * handles gas estimation, nonce management, signing, and broadcasting.
 */
exports.cdpApiKeyId = (0, params_1.defineSecret)("CDP_API_KEY_ID");
exports.cdpApiKeySecret = (0, params_1.defineSecret)("CDP_API_KEY_SECRET");
exports.cdpWalletSecret = (0, params_1.defineSecret)("CDP_WALLET_SECRET");
exports.cdpWalletSecrets = [exports.cdpApiKeyId, exports.cdpApiKeySecret, exports.cdpWalletSecret];
const ERC20_TRANSFER_ABI = [{
        name: "transfer",
        type: "function",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
    }];
function createCdpWalletPort() {
    const cdp = new cdp_sdk_1.CdpClient({
        apiKeyId: exports.cdpApiKeyId.value(),
        apiKeySecret: exports.cdpApiKeySecret.value(),
        walletSecret: exports.cdpWalletSecret.value(),
    });
    return {
        async getOrCreateAccount(name) {
            const account = await cdp.evm.getOrCreateAccount({ name });
            return {
                address: account.address,
                accountPolicy: account.accountPolicy,
            };
        },
        async transferToken(params) {
            const data = (0, viem_1.encodeFunctionData)({
                abi: ERC20_TRANSFER_ABI,
                functionName: "transfer",
                args: [params.to, params.amountBaseUnits],
            });
            const { transactionHash } = await cdp.evm.sendTransaction({
                address: params.fromAddress,
                network: params.network,
                transaction: {
                    to: params.tokenContractAddress,
                    data,
                },
            });
            return { transactionHash };
        },
    };
}
//# sourceMappingURL=cdpWalletAdapter.js.map