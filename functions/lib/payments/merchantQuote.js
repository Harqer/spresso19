"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantQuoteError = void 0;
exports.getMerchantQuote = getMerchantQuote;
const discoveredListing_1 = require("../contracts/discoveredListing");
const MAX_OBSERVATION_AGE_MS = 5 * 60 * 1000;
class MerchantQuoteError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.MerchantQuoteError = MerchantQuoteError;
function parseTimestamp(value, field) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
        throw new MerchantQuoteError("invalid-observation", `The provider returned an invalid ${field}.`);
    }
    return timestamp;
}
function canonicalCurrency(value) {
    const currency = value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
        throw new MerchantQuoteError("invalid-observation", "The provider returned an invalid currency.");
    }
    return currency;
}
function toCents(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new MerchantQuoteError("unknown-price", "The provider did not return a usable price.");
    }
    const cents = Math.round((amount + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) {
        throw new MerchantQuoteError("invalid-observation", "The provider returned an unsupported price.");
    }
    return cents;
}
async function getMerchantQuote(snapshot, provider, now = new Date()) {
    var _a;
    const observation = await provider.lookup(snapshot);
    const merchantUrl = (0, discoveredListing_1.canonicalMerchantUrl)(observation.merchantUrl);
    const expectedMerchantUrl = (0, discoveredListing_1.canonicalMerchantUrl)(snapshot.merchantUrl);
    if (observation.listingId !== snapshot.id || merchantUrl !== expectedMerchantUrl) {
        throw new MerchantQuoteError("invalid-observation", "The provider quote does not match the cart listing.");
    }
    const observedAt = parseTimestamp(observation.observedAt, "observation time");
    if (observedAt.getTime() > now.getTime() || now.getTime() - observedAt.getTime() > MAX_OBSERVATION_AGE_MS) {
        throw new MerchantQuoteError("stale-observation", "Get a fresh merchant quote before continuing.");
    }
    let expiresAt;
    if (observation.expiresAt) {
        expiresAt = parseTimestamp(observation.expiresAt, "expiry time");
        if (expiresAt.getTime() <= now.getTime() || expiresAt.getTime() <= observedAt.getTime()) {
            throw new MerchantQuoteError("stale-observation", "Get a fresh merchant quote before continuing.");
        }
    }
    const unitAmountCents = toCents((_a = observation.amount) !== null && _a !== void 0 ? _a : Number.NaN);
    const totalAmountCents = unitAmountCents * snapshot.quantity;
    if (!Number.isSafeInteger(totalAmountCents) || totalAmountCents <= 0) {
        throw new MerchantQuoteError("invalid-observation", "The quoted total is unsupported.");
    }
    return Object.assign({ listingId: snapshot.id, merchantUrl, quantity: snapshot.quantity, currency: canonicalCurrency(observation.currency), unitAmountCents,
        totalAmountCents, observedAt: observedAt.toISOString() }, (expiresAt ? { expiresAt: expiresAt.toISOString() } : {}));
}
//# sourceMappingURL=merchantQuote.js.map