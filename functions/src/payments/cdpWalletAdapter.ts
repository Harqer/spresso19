import { CdpClient } from "@coinbase/cdp-sdk";
import { encodeFunctionData } from "viem";
import { defineSecret } from "firebase-functions/params";
import type { CdpWalletPort, AllowedNetwork } from "./agentWallet";

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
export const cdpApiKeyId = defineSecret("CDP_API_KEY_ID");
export const cdpApiKeySecret = defineSecret("CDP_API_KEY_SECRET");
export const cdpWalletSecret = defineSecret("CDP_WALLET_SECRET");

export const cdpWalletSecrets = [cdpApiKeyId, cdpApiKeySecret, cdpWalletSecret];

const ERC20_TRANSFER_ABI = [{
  name: "transfer",
  type: "function" as const,
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ type: "bool" }],
}];

export function createCdpWalletPort(): CdpWalletPort {
  const cdp = new CdpClient({
    apiKeyId: cdpApiKeyId.value(),
    apiKeySecret: cdpApiKeySecret.value(),
    walletSecret: cdpWalletSecret.value(),
  });

  return {
    async getOrCreateAccount(name: string) {
      const account = await cdp.evm.getOrCreateAccount({ name });
      return {
        address: account.address,
        accountPolicy: (account as { accountPolicy?: string }).accountPolicy,
      };
    },
    async transferToken(params: {
      fromAddress: string;
      to: string;
      amountBaseUnits: bigint;
      network: AllowedNetwork;
      tokenContractAddress: string;
    }) {
      const data = encodeFunctionData({
        abi: ERC20_TRANSFER_ABI,
        functionName: "transfer",
        args: [params.to as `0x${string}`, params.amountBaseUnits],
      });
      const { transactionHash } = await cdp.evm.sendTransaction({
        address: params.fromAddress as `0x${string}`,
        network: params.network,
        transaction: {
          to: params.tokenContractAddress as `0x${string}`,
          data,
        },
      });
      return { transactionHash };
    },
  };
}
