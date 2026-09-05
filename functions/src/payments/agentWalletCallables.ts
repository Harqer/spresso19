import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { db } from "../shared/db";
import {
  createAgentWalletService,
  AGENT_WALLET_ACCOUNT_NAME,
  PrepareTransferSchema,
  stablecoinContractAddress,
  stablecoinSymbol,
  stablecoinDecimals,
  tokenSymbol,
  tokenDecimals,
} from "./agentWallet";
import { createCdpWalletPort, cdpWalletSecrets } from "./cdpWalletAdapter";

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
  return createAgentWalletService(createCdpWalletPort(), stablecoinContractAddress.value());
}

export const getAgentWalletStatus = onCall(
  { enforceAppCheck: true, secrets: [...cdpWalletSecrets, stablecoinContractAddress, stablecoinSymbol, stablecoinDecimals], maxInstances: 20, minInstances: 0 },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    try {
      const wallet = await service().getAccount();
      return {
        address: wallet.address,
        policyBound: Boolean(wallet.accountPolicy),
        tokenSymbol: tokenSymbol(),
        tokenDecimals: tokenDecimals(),
      };
    } catch (error) {
      console.error("Agent wallet status failed", { error: error instanceof Error ? error.message : String(error) });
      throw new HttpsError("internal", "The wallet service is unavailable right now.");
    }
  },
);

export const prepareAgentTransfer = onCall(
  { enforceAppCheck: true, secrets: [...cdpWalletSecrets, stablecoinContractAddress, stablecoinDecimals], maxInstances: 20, minInstances: 0 },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const input = PrepareTransferSchema.safeParse(request.data);
    if (!input.success) {
      throw new HttpsError("invalid-argument", "A valid recipient, USDC amount, and network are required.");
    }

    try {
      const prepared = await service().prepareTransfer(input.data);
      return {
        transferId: prepared.transferId,
        destinationAddress: prepared.destinationAddress,
        amountTokenBaseUnits: prepared.amountTokenBaseUnits,
        tokenSymbol: tokenSymbol(),
        tokenDecimals: tokenDecimals(),
        network: prepared.network,
        status: prepared.status,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("spend policy")) {
        throw new HttpsError("failed-precondition", "That amount is above the allowed limit for wallet transfers.");
      }
      console.error("Agent transfer preparation failed", { message });
      throw new HttpsError("internal", "We couldn't stage that transfer. Please try again.");
    }
  },
);

export const confirmAgentTransfer = onCall(
  { enforceAppCheck: true, secrets: [...cdpWalletSecrets, stablecoinContractAddress, stablecoinDecimals], maxInstances: 20, minInstances: 0 },
  async (request) => {
    if (!request.auth || request.auth.token.firebase?.sign_in_provider === "anonymous") {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }
    const input = z
      .object({
        ...PrepareTransferSchema.shape,
        userConfirmationToken: z.string().min(8).max(256),
      })
      .strict()
      .safeParse(request.data);
    if (!input.success) {
      throw new HttpsError("invalid-argument", "Confirmation requires the prepared transfer details.");
    }

    try {
      const executed = await service().confirmAndExecuteTransfer(input.data);
      return { transferId: executed.transferId, transactionHash: executed.transactionHash, status: executed.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Explicit user confirmation")) {
        throw new HttpsError("failed-precondition", "Confirm the transfer in the app before it can be sent.");
      }
      if (message.includes("No prepared transfer")) {
        throw new HttpsError("failed-precondition", "This transfer is no longer awaiting confirmation.");
      }
      if (message.includes("does not match")) {
        throw new HttpsError("invalid-argument", "Confirmation details do not match the prepared transfer.");
      }
      if (message.includes("spend policy")) {
        throw new HttpsError("failed-precondition", "That amount is above the allowed limit for wallet transfers.");
      }
      console.error("Agent transfer execution failed", { message });
      throw new HttpsError("internal", "The transfer could not be completed. Please try again.");
    }
  },
);

export const AGENT_WALLET_ACCOUNT = AGENT_WALLET_ACCOUNT_NAME;

// Firestore listeners for wallet transfer records (audit trail lives in
// console logs; the records themselves are in the walletTransfers collection).
export const walletTransferAuditRef = db.collection("walletTransfers");
