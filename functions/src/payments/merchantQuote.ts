import { canonicalMerchantUrl, type CartListingSnapshot } from "../contracts/discoveredListing";

const MAX_OBSERVATION_AGE_MS = 5 * 60 * 1000;

export type MerchantPriceObservation = {
  listingId: string;
  merchantUrl: string;
  amount?: number;
  currency: string;
  observedAt: string;
  expiresAt?: string;
};

export interface MerchantQuoteProvider {
  lookup(snapshot: CartListingSnapshot): Promise<MerchantPriceObservation>;
}

export type MerchantQuote = {
  listingId: string;
  merchantUrl: string;
  quantity: number;
  currency: string;
  unitAmountCents: number;
  totalAmountCents: number;
  observedAt: string;
  expiresAt?: string;
};

export class MerchantQuoteError extends Error {
  constructor(
    public readonly code: "invalid-observation" | "stale-observation" | "unknown-price",
    message: string,
  ) {
    super(message);
  }
}

function parseTimestamp(value: string, field: string): Date {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
    throw new MerchantQuoteError("invalid-observation", `The provider returned an invalid ${field}.`);
  }
  return timestamp;
}

function canonicalCurrency(value: string): string {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new MerchantQuoteError("invalid-observation", "The provider returned an invalid currency.");
  }
  return currency;
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new MerchantQuoteError("unknown-price", "The provider did not return a usable price.");
  }
  const cents = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new MerchantQuoteError("invalid-observation", "The provider returned an unsupported price.");
  }
  return cents;
}

export async function getMerchantQuote(
  snapshot: CartListingSnapshot,
  provider: MerchantQuoteProvider,
  now: Date = new Date(),
): Promise<MerchantQuote> {
  const observation = await provider.lookup(snapshot);
  const merchantUrl = canonicalMerchantUrl(observation.merchantUrl);
  const expectedMerchantUrl = canonicalMerchantUrl(snapshot.merchantUrl);
  if (observation.listingId !== snapshot.id || merchantUrl !== expectedMerchantUrl) {
    throw new MerchantQuoteError("invalid-observation", "The provider quote does not match the cart listing.");
  }

  const observedAt = parseTimestamp(observation.observedAt, "observation time");
  if (observedAt.getTime() > now.getTime() || now.getTime() - observedAt.getTime() > MAX_OBSERVATION_AGE_MS) {
    throw new MerchantQuoteError("stale-observation", "Get a fresh merchant quote before continuing.");
  }

  let expiresAt: Date | undefined;
  if (observation.expiresAt) {
    expiresAt = parseTimestamp(observation.expiresAt, "expiry time");
    if (expiresAt.getTime() <= now.getTime() || expiresAt.getTime() <= observedAt.getTime()) {
      throw new MerchantQuoteError("stale-observation", "Get a fresh merchant quote before continuing.");
    }
  }

  const unitAmountCents = toCents(observation.amount ?? Number.NaN);
  const totalAmountCents = unitAmountCents * snapshot.quantity;
  if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents <= 0) {
    throw new MerchantQuoteError("invalid-observation", "The quoted total is unsupported.");
  }

  return {
    listingId: snapshot.id,
    merchantUrl,
    quantity: snapshot.quantity,
    currency: canonicalCurrency(observation.currency),
    unitAmountCents,
    totalAmountCents,
    observedAt: observedAt.toISOString(),
    ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
  };
}
