import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as jwt from "jsonwebtoken";
import { z } from "zod";
import { orderRef as orderRefFor } from "../shared/orderRefs";

const stripePublishableKey = defineSecret("STRIPE_PUBLISHABLE_KEY");

const MerchantHandoffSchema = z.object({
  listingId: z.string().min(1).max(256).optional(),
  quantity: z.number().int().positive().max(25).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).strict();

function rejectClientControlledMerchantPayment(data: unknown): never {
  if (!MerchantHandoffSchema.safeParse(data).success) {
    throw new HttpsError(
      "invalid-argument",
      "Merchant checkout does not accept client prices, currency, merchant URLs, or payment amounts.",
    );
  }
  throw new HttpsError(
    "failed-precondition",
    "Complete checkout on the merchant site. Spresso does not process merchant payments.",
  );
}

export const getStripeConfig = onCall({ enforceAppCheck: true, secrets: [stripePublishableKey], maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return { publishableKey: stripePublishableKey.value() };
});

// Merchant listings remain user-completed checkout. This callable is retained
// only to reject older clients before any payment provider call can occur.
export const createStripeIntent = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return rejectClientControlledMerchantPayment(request.data);
});

// A device confirmation can authorize a user action, but it cannot turn a
// merchant listing into a Spresso-controlled payment operation.
export const confirmPurchase = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return rejectClientControlledMerchantPayment(request.data);
});

const googleWalletPrivateKey = defineSecret("GOOGLE_WALLET_PRIVATE_KEY");
const googleWalletIssuerId = defineSecret("GOOGLE_WALLET_ISSUER_ID");
const googleWalletClassId = defineSecret("GOOGLE_WALLET_CLASS_ID");
const googleWalletServiceAccountEmail = defineSecret("GOOGLE_WALLET_SA_EMAIL");

export const generateGoogleWalletPassJwt = onCall({ enforceAppCheck: true, secrets: [googleWalletPrivateKey, googleWalletIssuerId, googleWalletClassId, googleWalletServiceAccountEmail], maxInstances: 20, minInstances: 0 }, async (request) => {
  const authUid: string | undefined = request.auth?.uid;
  if (!authUid) throw new HttpsError("unauthenticated", "Must be logged in.");

  const input = z.object({ orderId: z.string().min(1).max(256) }).safeParse(request.data);
  if (!input.success) {
    throw new HttpsError("invalid-argument", "A valid order is required.");
  }

  if (!googleWalletPrivateKey.value() || !googleWalletServiceAccountEmail.value() ||
      !googleWalletIssuerId.value() || !googleWalletClassId.value()) {
    throw new HttpsError("failed-precondition", "Missing Google Wallet service account credentials.");
  }

  const orderSnapshot = await orderRefFor(authUid, input.data.orderId).get();
  const order = orderSnapshot.data();
  if (!orderSnapshot.exists || order?.userId !== authUid) {
    throw new HttpsError("not-found", "Order not found.");
  }

  const issuerId = googleWalletIssuerId.value();
  const classId = googleWalletClassId.value();
  const safeOrderId = input.data.orderId.replace(/[^A-Za-z0-9._-]/g, "_");
  const objectId = `${issuerId}.spresso_order_${safeOrderId}`;
  const totalAmount = Number(order.totalAmount);
  const totalLabel = Number.isFinite(totalAmount)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalAmount)
    : "Order confirmed";
  const firstItemName = Array.isArray(order.items) && typeof order.items[0]?.product?.name === "string"
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
  } catch (error) {
    console.error("Google Wallet JWT signing failed", error);
    throw new HttpsError("internal", "Failed to generate Google Wallet JWT");
  }
});

const cdpApiKeyId = defineSecret("CDP_API_KEY_NAME");
const cdpApiKeySecret = defineSecret("CDP_API_KEY_PRIVATE_KEY");

export const executeBiometricPurchase = onCall({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret], maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  throw new HttpsError(
    "failed-precondition",
    "Complete checkout on the merchant site. Spresso does not execute merchant purchases.",
  );
});

export const processCryptoPayment = onCall({ enforceAppCheck: true, secrets: [cdpApiKeyId, cdpApiKeySecret], maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");
  throw new HttpsError(
    "failed-precondition",
    "Complete checkout on the merchant site. Direct crypto payment requests are disabled.",
  );
});
