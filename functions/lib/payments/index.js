"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processCryptoPayment = exports.executeBiometricPurchase = exports.generateGoogleWalletPassJwt = exports.confirmPurchase = exports.createStripeIntent = exports.getStripeConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const jwt = __importStar(require("jsonwebtoken"));
const zod_1 = require("zod");
const orderRefs_1 = require("../shared/orderRefs");
const stripePublishableKey = (0, params_1.defineSecret)("STRIPE_PUBLISHABLE_KEY");
const MerchantHandoffSchema = zod_1.z.object({
    listingId: zod_1.z.string().min(1).max(256).optional(),
    quantity: zod_1.z.number().int().positive().max(25).optional(),
    idempotencyKey: zod_1.z.string().uuid().optional(),
}).strict();
function rejectClientControlledMerchantPayment(data) {
    if (!MerchantHandoffSchema.safeParse(data).success) {
        throw new https_1.HttpsError("invalid-argument", "Merchant checkout does not accept client prices, currency, merchant URLs, or payment amounts.");
    }
    throw new https_1.HttpsError("failed-precondition", "Complete checkout on the merchant site. Spresso does not process merchant payments.");
}
exports.getStripeConfig = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [stripePublishableKey], maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return { publishableKey: stripePublishableKey.value() };
});
// Merchant listings remain user-completed checkout. This callable is retained
// only to reject older clients before any payment provider call can occur.
exports.createStripeIntent = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return rejectClientControlledMerchantPayment(request.data);
});
// A device confirmation can authorize a user action, but it cannot turn a
// merchant listing into a Spresso-controlled payment operation.
exports.confirmPurchase = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "You must be signed in.");
    return rejectClientControlledMerchantPayment(request.data);
});
const googleWalletPrivateKey = (0, params_1.defineSecret)("GOOGLE_WALLET_PRIVATE_KEY");
const googleWalletIssuerId = (0, params_1.defineSecret)("GOOGLE_WALLET_ISSUER_ID");
const googleWalletClassId = (0, params_1.defineSecret)("GOOGLE_WALLET_CLASS_ID");
const googleWalletServiceAccountEmail = (0, params_1.defineSecret)("GOOGLE_WALLET_SA_EMAIL");
exports.generateGoogleWalletPassJwt = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [googleWalletPrivateKey, googleWalletIssuerId, googleWalletClassId, googleWalletServiceAccountEmail], maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a, _b, _c;
    const authUid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    if (!authUid)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    const input = zod_1.z.object({ orderId: zod_1.z.string().min(1).max(256) }).safeParse(request.data);
    if (!input.success) {
        throw new https_1.HttpsError("invalid-argument", "A valid order is required.");
    }
    if (!googleWalletPrivateKey.value() || !googleWalletServiceAccountEmail.value() ||
        !googleWalletIssuerId.value() || !googleWalletClassId.value()) {
        throw new https_1.HttpsError("failed-precondition", "Missing Google Wallet service account credentials.");
    }
    const orderSnapshot = await (0, orderRefs_1.orderRef)(authUid, input.data.orderId).get();
    const order = orderSnapshot.data();
    if (!orderSnapshot.exists || (order === null || order === void 0 ? void 0 : order.userId) !== authUid) {
        throw new https_1.HttpsError("not-found", "Order not found.");
    }
    const issuerId = googleWalletIssuerId.value();
    const classId = googleWalletClassId.value();
    const safeOrderId = input.data.orderId.replace(/[^A-Za-z0-9._-]/g, "_");
    const objectId = `${issuerId}.spresso_order_${safeOrderId}`;
    const totalAmount = Number(order.totalAmount);
    const totalLabel = Number.isFinite(totalAmount)
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalAmount)
        : "Order confirmed";
    const firstItemName = Array.isArray(order.items) && typeof ((_c = (_b = order.items[0]) === null || _b === void 0 ? void 0 : _b.product) === null || _c === void 0 ? void 0 : _c.name) === "string"
        ? order.items[0].product.name
        : "Spresso order";
    const claims = {
        iss: googleWalletServiceAccountEmail.value(),
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        origins: [],
        payload: {
            genericObjects: [{
                    id: objectId,
                    classId: `${issuerId}.${classId}`,
                    genericType: "GENERIC_TYPE_UNSPECIFIED",
                    hexBackgroundColor: "#386633",
                    cardTitle: { defaultValue: { language: "en", value: "Spresso order" } },
                    header: { defaultValue: { language: "en", value: firstItemName } },
                    subheader: { defaultValue: { language: "en", value: totalLabel } },
                    textModulesData: [{
                            id: "order_status",
                            header: "Order status",
                            body: typeof order.status === "string" ? order.status.replace(/_/g, " ") : "Confirmed",
                        }],
                }],
        },
    };
    try {
        const token = jwt.sign(claims, googleWalletPrivateKey.value().replace(/\\n/g, "\n"), { algorithm: "RS256" });
        return { jwt: token, success: true };
    }
    catch (error) {
        console.error("Google Wallet JWT signing failed", error);
        throw new https_1.HttpsError("internal", "Failed to generate Google Wallet JWT");
    }
});
const cdpApiKeyId = (0, params_1.defineSecret)("CDP_API_KEY_NAME");
const cdpApiKeySecret = (0, params_1.defineSecret)("CDP_API_KEY_PRIVATE_KEY");
exports.executeBiometricPurchase = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret], maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    throw new https_1.HttpsError("failed-precondition", "Complete checkout on the merchant site. Spresso does not execute merchant purchases.");
});
exports.processCryptoPayment = (0, https_1.onCall)({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret], maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be logged in.");
    throw new https_1.HttpsError("failed-precondition", "Complete checkout on the merchant site. Direct crypto payment requests are disabled.");
});
//# sourceMappingURL=index.js.map