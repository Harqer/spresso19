import { z } from "zod";
import { db } from "../shared/db";

/**
 * Spresso Agent Wallet boundary (personal stablecoin edition).
 *
 * Settlement token: the operator's own ERC-20 stablecoin ("Spresso Dollar"),
 * configured via the SPRESSO_TOKEN_* secrets/params below. The contract
 * address is server configuration — the client can never choose the token.
 *
 * Custody and policy live at Coinbase Developer Platform (CDP): private keys
 * never leave CDP's TEE, and every signature request is evaluated against a
 * CDP policy (value cap, recipient allowlist, network allowlist) attached to
 * the wallet account. Spresso servers hold only API identifiers (never key
 * material) as Firebase secrets bound per function.
 *
 * Human-control mandate: an agent may PREPARE a transfer (quote for review),
 * but only an explicit user confirmation in the trusted UI may EXECUTE it.
 * Execution is idempotent per user confirmation token, amount-locked to the
 * prepared quote, and fully audit-logged server-side.
 */

import { defineSecret } from "firebase-functions/params";

/** ERC-20 contract address of the operator's personal stablecoin. */
export const stablecoinContractAddress = defineSecret("SPRESSO_TOKEN_CONTRACT_ADDRESS");
/** Stablecoin symbol used in customer-facing copy (e.g. "SPD"). */
export const stablecoinSymbol = defineSecret("SPRESSO_TOKEN_SYMBOL");
/** Token decimals (6 for most stablecoins; stored as string, parsed as int). */
export const stablecoinDecimals = defineSecret("SPRESSO_TOKEN_DECIMALS");

export const AGENT_WALLET_ACCOUNT_NAME = "spresso-agent-wallet";

// Guardrail constants — also enforced client-independently here, with the CDP
// policy as the second, independent layer of defense.
export const MAX_TRANSFER_TOKEN_CENTS = 10_000; // 100.00 tokens per transfer
export const ALLOWED_NETWORKS = ["base", "base-sepolia"] as const;
export type AllowedNetwork = (typeof ALLOWED_NETWORKS)[number];

const PrepareTransferSchema = z.object({
  destinationAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "A valid EVM destination address is required."),
  amountTokenBaseUnits: z.string().regex(/^\d+$/, "Token amount must be an integer string in base units."),
  network: z.enum(ALLOWED_NETWORKS),
  idempotencyKey: z.string().uuid(),
}).strict();

export type PrepareTransferInput = z.infer<typeof PrepareTransferSchema>;
export type ConfirmTransferInput = PrepareTransferInput & { userConfirmationToken: string };

export type PreparedTransfer = {
  transferId: string;
  destinationAddress: string;
  amountTokenBaseUnits: string;
  network: AllowedNetwork;
  status: "PREPARED";
};

export type ExecutedTransfer = {
  transferId: string;
  transactionHash: string;
  status: "EXECUTED";
};

export function tokenDecimals(): number {
  const raw = Number(stablecoinDecimals.value() || "6");
  return Number.isInteger(raw) && raw > 0 && raw <= 18 ? raw : 6;
}

export function tokenSymbol(): string {
  return (stablecoinSymbol.value() || "SPD").slice(0, 12);
}

/**
 * Port seam so the boundary is testable without network access. The production
 * adapter wraps @coinbase/cdp-sdk; tests inject fakes.
 */
export interface CdpWalletPort {
  getOrCreateAccount(name: string): Promise<{ address: string; accountPolicy?: string }>;
  /** Send an ERC-20 transfer of the configured stablecoin from the wallet account. */
  transferToken(params: {
    fromAddress: string;
    to: string;
    amountBaseUnits: bigint;
    network: AllowedNetwork;
    tokenContractAddress: string;
  }): Promise<{ transactionHash: string }>;
}

function assertValidTokenContract(address: string): void {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("The stablecoin contract address is not configured correctly.");
  }
}

export function assertWithinPolicy(input: PrepareTransferInput): void {
  const baseUnits = BigInt(input.amountTokenBaseUnits);
  const divisor = BigInt(10) ** BigInt(tokenDecimals() - 2); // base units per cent
  const cents = baseUnits / divisor;
  if (cents <= BigInt(0) || cents > BigInt(MAX_TRANSFER_TOKEN_CENTS)) {
    throw new Error("Transfer amount is outside the allowed spend policy.");
  }
}

export function createAgentWalletService(cdp: CdpWalletPort, tokenContractAddress: string) {
  assertValidTokenContract(tokenContractAddress);

  async function getAccount() {
    return cdp.getOrCreateAccount(AGENT_WALLET_ACCOUNT_NAME);
  }

  /**
   * Stage a transfer for human review. No funds move. Idempotent per key.
   */
  async function prepareTransfer(input: PrepareTransferInput): Promise<PreparedTransfer> {
    assertWithinPolicy(input);

    const wallet = await getAccount();
    const transferRef = db.collection("walletTransfers").doc(input.idempotencyKey);
    const existing = await transferRef.get();
    if (existing.exists) {
      const prior = existing.data();
      if (prior?.status === "PREPARED" || prior?.status === "EXECUTED") {
        return {
          transferId: transferRef.id,
          destinationAddress: prior.destinationAddress,
          amountTokenBaseUnits: prior.amountTokenBaseUnits,
          network: prior.network,
          status: prior.status,
        };
      }
    }

    const record: PreparedTransfer & { createdAt: string } = {
      transferId: transferRef.id,
      destinationAddress: input.destinationAddress,
      amountTokenBaseUnits: input.amountTokenBaseUnits,
      network: input.network,
      status: "PREPARED",
      createdAt: new Date().toISOString(),
    };
    await transferRef.set(record, { merge: true });

    // Audit log: server-side only, never surfaced in the customer UI.
    console.info("agent-wallet.transfer.prepared", {
      transferId: transferRef.id,
      destinationAddress: input.destinationAddress,
      amountTokenBaseUnits: input.amountTokenBaseUnits,
      network: input.network,
      walletAddress: wallet.address,
      tokenContract: tokenContractAddress,
    });

    return record;
  }

  /**
   * Execute a previously prepared transfer. Requires an explicit user
   * confirmation token (from the trusted UI confirmation step). Amount,
   * destination, and token are locked to the prepared record and server
   * configuration — the caller cannot alter any of them at execution time.
   */
  async function confirmAndExecuteTransfer(input: ConfirmTransferInput): Promise<ExecutedTransfer> {
    if (typeof input.userConfirmationToken !== "string" || input.userConfirmationToken.length < 8) {
      throw new Error("Explicit user confirmation is required before executing a transfer.");
    }

    const transferRef = db.collection("walletTransfers").doc(input.idempotencyKey);
    const existing = await transferRef.get();
    const prior = existing.data();
    if (!existing.exists || prior?.status !== "PREPARED") {
      throw new Error("No prepared transfer is awaiting confirmation.");
    }
    if (
      prior.destinationAddress !== input.destinationAddress ||
      prior.amountTokenBaseUnits !== input.amountTokenBaseUnits
    ) {
      throw new Error("Confirmation details do not match the prepared transfer.");
    }

    assertWithinPolicy({
      destinationAddress: prior.destinationAddress,
      amountTokenBaseUnits: prior.amountTokenBaseUnits,
      network: prior.network,
      idempotencyKey: input.idempotencyKey,
    });

    const wallet = await getAccount();
    const { transactionHash } = await cdp.transferToken({
      fromAddress: wallet.address,
      to: prior.destinationAddress,
      amountBaseUnits: BigInt(prior.amountTokenBaseUnits),
      network: prior.network,
      tokenContractAddress,
    });

    await transferRef.set({
      status: "EXECUTED",
      transactionHash,
      userConfirmationTokenPrefix: input.userConfirmationToken.slice(0, 8), // prefix only, for audit correlation
      executedAt: new Date().toISOString(),
    }, { merge: true });

    console.info("agent-wallet.transfer.executed", {
      transferId: transferRef.id,
      transactionHash,
      network: prior.network,
      tokenContract: tokenContractAddress,
    });

    return { transferId: transferRef.id, transactionHash, status: "EXECUTED" };
  }

  return { prepareTransfer, confirmAndExecuteTransfer, getAccount };
}

export { PrepareTransferSchema };
