"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.prepareCheckout = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const zod_1 = require("zod");
const db_1 = require("./shared/db");
const merchantQuote_1 = require("./payments/merchantQuote");
const kitesurfService_1 = require("./kitesurfService");
const cartListingSnapshot_1 = require("./cart/cartListingSnapshot");
const stripeSecretKey = (0, params_1.defineSecret)("STRIPE_SECRET_KEY");
const stripeWebhookSecret = (0, params_1.defineSecret)("STRIPE_WEBHOOK_SECRET");
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
// Spresso-controlled checkout: the server owns price discovery, the user owns
// the decision. No client-supplied amount, currency, or merchant URL is ever
// trusted; every payment is priced from a fresh merchant quote observed at
// request time, confirmed by the user in the trusted UI, settled by Stripe,
// and reconciled server-side by the signed webhook.
const PrepareCheckoutSchema = zod_1.z.object({
    listingId: zod_1.z.string().min(1).max(256),
    quantity: zod_1.z.number().int().positive().max(25),
    idempotencyKey: zod_1.z.string().uuid(),
}).strict();
function customerMessage(code) {
    switch (code) {
        case "invalid-observation":
            return "We couldn't verify the current merchant price for this item. Please try again in a moment.";
        case "stale-observation":
            return "The merchant price changed. Please confirm again to get a fresh quote.";
        case "unknown-price":
            return "This item is not currently purchasable. You can still view it at the merchant.";
    }
}
const kitesurfQuoteProvider = {
    async lookup(snapshot) {
        var _a, _b;
        const staging = await (0, kitesurfService_1.stageKitesurfListing)({ merchantUrl: snapshot.merchantUrl, name: snapshot.name }, {});
        if (staging.status !== "staged" || !staging.observedPrice) {
            throw new merchantQuote_1.MerchantQuoteError("unknown-price", `Merchant staging failed: ${(_a = staging.failureReason) !== null && _a !== void 0 ? _a : "unknown"}`);
        }
        return {
            listingId: snapshot.id,
            merchantUrl: (_b = staging.finalUrl) !== null && _b !== void 0 ? _b : snapshot.merchantUrl,
            amount: staging.observedPrice.amount,
            currency: staging.observedPrice.currency,
            observedAt: new Date().toISOString(),
        };
    },
};
function stripeClient() {
    return new stripe_1.default(stripeSecretKey.value(), {
        apiVersion: "2025-01-27.acacia",
    });
}
exports.prepareCheckout = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [stripeSecretKey, ...kitesurfService_1.kitesurfSecrets], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth || ((_a = request.auth.token.firebase) === null || _a === void 0 ? void 0 : _a.sign_in_provider) === "anonymous") {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to checkout.");
    }
    const input = PrepareCheckoutSchema.safeParse(request.data);
    if (!input.success) {
        throw new https_1.HttpsError("invalid-argument", "A valid item and quantity are required.");
    }
    const { listingId, quantity, idempotencyKey } = input.data;
    const uid = request.auth.uid;
    // The cart snapshot is the single source of truth for what is being
    // purchased. The client never sends listing data, price, or currency.
    const cartRef = db_1.db.collection("carts").doc(uid);
    const attemptRef = db_1.db.collection("purchaseAttempts").doc(`${uid}_${idempotencyKey}`);
    try {
        const attempt = await db_1.db.runTransaction(async (transaction) => {
            var _a;
            const [cartDoc, priorAttempt] = await Promise.all([
                transaction.get(cartRef),
                transaction.get(attemptRef),
            ]);
            if (priorAttempt.exists) {
                const prior = priorAttempt.data();
                if ((prior === null || prior === void 0 ? void 0 : prior.status) === "PENDING" && (prior === null || prior === void 0 ? void 0 : prior.clientSecret)) {
                    return prior;
                }
            }
            const items = Array.isArray((_a = cartDoc.data()) === null || _a === void 0 ? void 0 : _a.items) ? cartDoc.data().items : [];
            const snapshot = items.find((item) => (item === null || item === void 0 ? void 0 : item.id) === listingId);
            if (!snapshot) {
                throw new https_1.HttpsError("not-found", "That item is no longer in your cart.");
            }
            // The stored snapshot already carries the canonical listing metadata.
            const { quantity: _storedQuantity, addedAt: _storedAddedAt } = snapshot, storedListing = __rest(snapshot, ["quantity", "addedAt"]);
            const cartSnapshot = (0, cartListingSnapshot_1.createCartListingSnapshot)(storedListing, quantity);
            // Fresh price observation from the merchant at checkout time.
            const quote = await (0, merchantQuote_1.getMerchantQuote)(cartSnapshot, kitesurfQuoteProvider);
            const stripe = stripeClient();
            const intent = await stripe.paymentIntents.create({
                amount: quote.totalAmountCents,
                currency: quote.currency.toLowerCase(),
                automatic_payment_methods: { enabled: true },
                metadata: {
                    userId: uid,
                    listingId: quote.listingId,
                    quantity: String(quantity),
                    merchantUrl: quote.merchantUrl,
                    idempotencyKey,
                },
            }, { idempotencyKey: `prepare_${uid}_${idempotencyKey}` });
            const record = {
                userId: uid,
                listingId: quote.listingId,
                listingName: cartSnapshot.name,
                quantity,
                currency: quote.currency,
                unitAmountCents: quote.unitAmountCents,
                totalCents: quote.totalAmountCents,
                merchantUrl: quote.merchantUrl,
                paymentIntentId: intent.id,
                clientSecret: intent.client_secret,
                status: "PENDING",
                quoteObservedAt: quote.observedAt,
                createdAt: new Date().toISOString(),
            };
            transaction.set(attemptRef, record);
            return record;
        });
        return {
            clientSecret: attempt.clientSecret,
            totalCents: attempt.totalCents,
            currency: attempt.currency,
            publishableKey: stripePublishableKey.value(),
        };
    }
    catch (error) {
        if (error instanceof merchantQuote_1.MerchantQuoteError) {
            throw new https_1.HttpsError("failed-precondition", customerMessage(error.code));
        }
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("Checkout preparation failed", { error: error instanceof Error ? error.message : String(error) });
        throw new https_1.HttpsError("internal", "We couldn't start checkout. Please try again.");
    }
});
// Orders are created only after Stripe confirms the payment via a signed
// webhook event; the client callback alone is never sufficient.
exports.stripeWebhook = (0, https_1.onRequest)({ secrets: [stripeSecretKey, stripeWebhookSecret], maxInstances: 20, minInstances: 0 }, async (request, response) => {
    const signature = request.headers["stripe-signature"];
    if (typeof signature !== "string") {
        response.status(400).send("Missing signature");
        return;
    }
    let event;
    try {
        const stripe = stripeClient();
        event = stripe.webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret.value());
    }
    catch (error) {
        console.error("Stripe webhook signature verification failed.", { error: error === null || error === void 0 ? void 0 : error.message });
        response.status(400).send("Invalid signature");
        return;
    }
    if (event.type !== "payment_intent.succeeded") {
        response.status(200).send("Ignored");
        return;
    }
    const eventRef = db_1.db.collection("stripe_webhook_events").doc(event.id);
    const processingState = await db_1.db.runTransaction(async (transaction) => {
        var _a, _b, _c;
        const existing = await transaction.get(eventRef);
        if (((_a = existing.data()) === null || _a === void 0 ? void 0 : _a.status) === "COMPLETED") {
            return "COMPLETED";
        }
        const startedAtMs = (_b = existing.data()) === null || _b === void 0 ? void 0 : _b.startedAtMs;
        if (((_c = existing.data()) === null || _c === void 0 ? void 0 : _c.status) === "PROCESSING" &&
            typeof startedAtMs === "number" &&
            Date.now() - startedAtMs < 10 * 60 * 1000) {
            return "PROCESSING";
        }
        transaction.set(eventRef, {
            status: "PROCESSING",
            paymentIntentId: event.data.object.id,
            startedAtMs: Date.now(),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
        return "ACQUIRED";
    });
    if (processingState === "COMPLETED") {
        response.status(200).send("Already processed");
        return;
    }
    if (processingState === "PROCESSING") {
        response.status(409).send("Processing in progress");
        return;
    }
    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata || {};
    const quantity = Number(metadata.quantity);
    if (!metadata.userId || !metadata.listingId || !Number.isInteger(quantity) || quantity <= 0) {
        await eventRef.set({ status: "IGNORED", updatedAt: new Date().toISOString() }, { merge: true });
        response.status(200).send("Unmanaged payment intent ignored");
        return;
    }
    try {
        // The attempt id is recovered from the idempotency key carried in intent
        // metadata; unmanaged intents (no idempotency key) are never reconciled.
        const attemptId = metadata.idempotencyKey;
        if (typeof attemptId !== "string" || attemptId.length === 0) {
            throw new Error("Payment intent is missing checkout idempotency metadata.");
        }
        const attemptRef = db_1.db.collection("purchaseAttempts").doc(`${metadata.userId}_${attemptId}`);
        const attemptSnapshot = await attemptRef.get();
        const attempt = attemptSnapshot.data();
        if (!attemptSnapshot.exists || (attempt === null || attempt === void 0 ? void 0 : attempt.paymentIntentId) !== paymentIntent.id) {
            throw new Error("No matching checkout attempt was found.");
        }
        if (attempt.totalCents !== paymentIntent.amount || attempt.currency !== paymentIntent.currency.toUpperCase()) {
            throw new Error("The settled amount does not match the quoted purchase.");
        }
        const orderId = attempt.orderId || db_1.db.collection("orders").doc().id;
        const userOrderRef = db_1.db.collection("users").doc(metadata.userId).collection("orders").doc(orderId);
        await db_1.db.runTransaction(async (transaction) => {
            const existingOrder = await transaction.get(userOrderRef);
            if (existingOrder.exists) {
                transaction.set(attemptRef, {
                    status: "COMPLETED",
                    orderId: userOrderRef.id,
                    paymentIntentId: paymentIntent.id,
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                transaction.set(eventRef, {
                    status: "COMPLETED",
                    orderId: userOrderRef.id,
                    completedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                }, { merge: true });
                return;
            }
            transaction.create(userOrderRef, {
                userId: metadata.userId,
                items: [{
                        listingId: attempt.listingId,
                        name: attempt.listingName || "Spresso order",
                        merchantUrl: attempt.merchantUrl,
                        unitAmountCents: attempt.unitAmountCents,
                        quantity: attempt.quantity,
                        currency: attempt.currency,
                    }],
                totalAmount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
                status: "PROCESSING",
                paymentIntentId: paymentIntent.id,
                merchantUrl: attempt.merchantUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            transaction.set(attemptRef, {
                status: "COMPLETED",
                orderId: userOrderRef.id,
                paymentIntentId: paymentIntent.id,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            transaction.set(eventRef, {
                status: "COMPLETED",
                orderId: userOrderRef.id,
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        });
        response.status(200).send("Completed");
    }
    catch (error) {
        console.error("Stripe order reconciliation failed; requesting retry.", {
            eventId: event.id,
            paymentIntentId: paymentIntent.id,
            error: error === null || error === void 0 ? void 0 : error.message,
        });
        await eventRef.set({ status: "FAILED", updatedAt: new Date().toISOString() }, { merge: true });
        response.status(500).send("Fulfillment failed");
    }
});
//# sourceMappingURL=webhooks.js.map