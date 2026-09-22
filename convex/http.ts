import Stripe from "stripe";
import { httpAction, env } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  BridgeError,
  optionalListingSnapshot,
  requireConvexId,
  requireExpenseCategory,
  requireListingSnapshot,
} from "./lib/bridge";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

function responseJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stripeSecret(): string {
  const value = env.STRIPE_SECRET_KEY;
  if (!value) throw new Error("Stripe is not configured in the Convex deployment.");
  return value;
}

function webhookSecret(): string {
  const value = env.STRIPE_WEBHOOK_SECRET;
  if (!value) throw new Error("Stripe webhook signing secret is not configured in the Convex deployment.");
  return value;
}

function decodeBase64(value: string): Uint8Array {
  const normalized = value.trim();
  if (!normalized || normalized.length > 36_000_000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new BridgeError("A valid base64 media payload is required.", 400);
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Signed Stripe webhook boundary. Raw body text is required — signature
 * verification runs over the exact request body with the SubtleCrypto provider
 * (Convex's default runtime has no Node crypto). A verified
 * `payment_intent.succeeded` creates the owner-visible Convex order exactly
 * once via the acquired inbox event; anything else fails with an honest status
 * so Stripe retries.
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return responseJson(400, { error: "Missing stripe-signature header." });

  const payload = await request.text();
  const stripe = new Stripe(stripeSecret(), { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret(), STRIPE_WEBHOOK_TOLERANCE_SECONDS, cryptoProvider);
  } catch {
    return responseJson(400, { error: "Webhook signature verification failed." });
  }

  if (event.type !== "payment_intent.succeeded") {
    return responseJson(200, { ignored: event.type });
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  const eventId = event.id;
  const paymentIntentId = intent.id;
  const amountCents = intent.amount;
  const currency = intent.currency;
  // Our own creation metadata enables the reconciler's healing path when the
  // charge landed but the confirm action died before attaching the intent.
  // Best-effort: malformed metadata downgrades to the strict intent-id match
  // instead of wedging this webhook into a permanent retry loop.
  const metadataAttemptIdRaw = intent.metadata?.checkoutAttemptId;
  let metadataAttemptId: Id<"checkoutAttempts"> | undefined;
  if (typeof metadataAttemptIdRaw === "string" && metadataAttemptIdRaw.trim()) {
    try {
      metadataAttemptId = requireConvexId<"checkoutAttempts">(metadataAttemptIdRaw, "checkoutAttemptId");
    } catch {
      metadataAttemptId = undefined;
    }
  }
  if (!paymentIntentId || !Number.isInteger(amountCents) || amountCents <= 0 || !currency) {
    return responseJson(200, { ignored: "Unmanaged payment intent payload." });
  }

  const payloadHash = `sha256:${intent.id}:${intent.amount}:${intent.currency}:${event.id}`;
  const { acquired } = await ctx.runMutation(internal.commerce.checkout.acquireWebhookEvent, {
    provider: "stripe",
    eventId,
    payloadHash,
  });

  if (!acquired) {
    // Same event already recorded: completed earlier or mid-flight in another
    // delivery. 409 is retryable for a still-processing event and harmless
    // once the order already exists.
    return responseJson(409, { error: "Event already recorded." });
  }

  try {
    const { orderId, created } = await ctx.runMutation(internal.commerce.checkout.completePayment, {
      provider: "stripe",
      eventId,
      paymentIntentId,
      amountCents,
      currency,
      checkoutAttemptId: metadataAttemptId,
    });
    return responseJson(200, { orderId, created });
  } catch (cause) {
    await ctx.runMutation(internal.commerce.checkout.completeWebhookEvent, {
      provider: "stripe",
      eventId,
      status: "FAILED",
    }).catch(() => undefined);
    console.error("Stripe order reconciliation failed.", { eventId, paymentIntentId, cause: cause instanceof Error ? cause.message : String(cause) });
    return responseJson(500, { error: "Order reconciliation failed." });
  }
});

const http = httpRouter();

http.route({ path: "/stripe_webhook", method: "POST", handler: stripeWebhook });

export const uploadMediaHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { bytesBase64?: unknown; mimeType?: unknown; jobId?: unknown };
    if (typeof body.bytesBase64 !== "string" || typeof body.mimeType !== "string") {
      throw new BridgeError("bytesBase64 and mimeType are required.", 400);
    }
    const result = await ctx.runAction(api.media.actions.storeUploadedBytes, {
      bytes: decodeBase64(body.bytesBase64).buffer as ArrayBuffer,
      mimeType: body.mimeType,
      ...(typeof body.jobId === "string" ? { jobId: body.jobId } : {}),
    });
    return result;
  });
});

export const mediaReadUrlHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { assetId?: unknown };
    if (typeof body.assetId !== "string" || !body.assetId.trim()) throw new BridgeError("assetId is required.", 400);
    return ctx.runAction(api.media.actions.createPrivateReadUrl, {
      assetId: requireConvexId<"mediaAssets">(body.assetId, "assetId"),
    });
  });
});

export const visionSearchHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { imageMediaKey?: unknown };
    if (typeof body.imageMediaKey !== "string" || !body.imageMediaKey.trim()) {
      throw new BridgeError("imageMediaKey is required.", 400);
    }
    return ctx.runAction(api.vision.searchByImage, { imageMediaKey: body.imageMediaKey });
  });
});

export const tryOnHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    const identity = await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as {
      mediaAssetId?: unknown;
      garmentImageUrl?: unknown;
      idempotencyKey?: unknown;
    };
    if (typeof body.mediaAssetId !== "string" || !body.mediaAssetId.trim()) throw new BridgeError("mediaAssetId is required.", 400);
    if (typeof body.garmentImageUrl !== "string" || !body.garmentImageUrl.startsWith("https://")) {
      throw new BridgeError("A verified HTTPS garment image is required.", 400);
    }
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : `try-on:${body.mediaAssetId}:${body.garmentImageUrl}`;
    const personImage = await ctx.runAction(api.media.actions.createPrivateReadUrl, {
      assetId: requireConvexId<"mediaAssets">(body.mediaAssetId, "mediaAssetId"),
    });
    const jobId = await ctx.runMutation(internal.mediaJobs.createInternal, {
      tokenIdentifier: identity.tokenIdentifier,
      idempotencyKey,
      kind: "virtual_try_on",
      mediaType: "image",
      imageUrls: [personImage.url, body.garmentImageUrl],
    });
    const result = await ctx.runAction(api.media.actions.runTryOnJob, {
      jobId,
      personImageUrl: personImage.url,
      garmentImageUrl: body.garmentImageUrl,
    });
    if (!result.assetId) throw new Error("Try-on completed without a verified media asset.");
    const output = await ctx.runAction(api.media.actions.createPrivateReadUrl, { assetId: result.assetId });
    return { jobId, status: result.status, mediaUrl: output.url };
  });
});

/**
 * Typed HTTP bridge for the KMP clients (Android / WebAssembly), which reach
 * Convex over HTTPS with their existing Firebase ID token instead of the JS
 * websocket client. Convex verifies the Bearer JWT against auth.config.ts, so
 * `ctx.auth.getUserIdentity()` is the platform-verified identity and it
 * propagates into the domain queries/mutations/actions below. Every route
 * delegates all business rules to the domain modules — the bridge adds
 * transport only, never authorization logic.
 */

function bearerIdentity(ctx: { auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> } }): Promise<{ tokenIdentifier: string }> {
  return (async () => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new BridgeError("Unauthenticated: sign in required.", 401);
    return identity;
  })();
}

function errorStatus(cause: unknown): number {
  if (cause instanceof BridgeError) return cause.status;
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/rate limit exceeded/i.test(message)) return 429;
  if (/not configured/i.test(message)) return 503;
  if (/unauthenticated/i.test(message)) return 401;
  if (/not found|must be|is required|invalid|validator|cannot/i.test(message)) return 400;
  return 500;
}

async function runBridge(handler: () => Promise<unknown>): Promise<Response> {
  try {
    const value = await handler();
    return responseJson(200, value ?? null);
  } catch (cause) {
    const status = errorStatus(cause);
    const message = cause instanceof Error ? cause.message : String(cause);
    if (status >= 500) console.error("HTTP bridge failure.", { status, message });
    return responseJson(status, { error: message });
  }
}

function boundedInt(value: number | null, fallback: number, max: number): number {
  if (value === null || !Number.isInteger(value) || value < 1) return fallback;
  return Math.min(value, max);
}

function queryInt(request: Request, name: string): number | null {
  const raw = new URL(request.url).searchParams.get(name);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---- Authentication/account lifecycle -------------------------------------

export const userMeHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.users.me, {});
  });
});

export const updateUserProfileHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { displayName?: unknown; photoUrl?: unknown };
    if (typeof body.displayName !== "string") throw new BridgeError("displayName is required.", 400);
    await ctx.runMutation(api.users.updateProfile, {
      displayName: body.displayName,
      ...(typeof body.photoUrl === "string" ? { photoUrl: body.photoUrl } : {}),
    });
    return { success: true };
  });
});

export const bootstrapUserHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { email?: unknown; displayName?: unknown };
    return {
      userId: await ctx.runMutation(api.users.bootstrap, {
        ...(typeof body.email === "string" ? { email: body.email } : {}),
        ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}),
      }),
    };
  });
});

export const getPreferencesHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.reactiveState.getPreferences, {});
  });
});

export const setPreferencesHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      preferenceId: await ctx.runMutation(api.reactiveState.setPreferences, {
        ...(typeof body.onboardingCompleted === "boolean" ? { onboardingCompleted: body.onboardingCompleted } : {}),
        ...(typeof body.pushNotifications === "boolean" ? { pushNotifications: body.pushNotifications } : {}),
        ...(body.fitPreference === "tailored" || body.fitPreference === "regular" || body.fitPreference === "relaxed" || body.fitPreference === "oversized"
          ? { fitPreference: body.fitPreference }
          : {}),
        ...(typeof body.height === "string" ? { height: body.height } : {}),
        ...(typeof body.weight === "string" ? { weight: body.weight } : {}),
        ...(Array.isArray(body.searchInquiries) ? { searchInquiries: body.searchInquiries.filter((value): value is string => typeof value === "string") } : {}),
        ...(Array.isArray(body.vibes) ? { vibes: body.vibes.filter((value): value is string => typeof value === "string") } : {}),
      }),
    };
  });
});

export const requestAccountDeletionHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return { operationId: await ctx.runMutation(api.users.requestAccountDeletion, {}) };
  });
});

export const accountDeletionStatusHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.users.getAccountDeletion, {});
  });
});

export const connectCoinbaseWalletHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { address?: unknown; network?: unknown };
    if (typeof body.address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      throw new BridgeError("A valid Base wallet address is required.", 400);
    }
    await ctx.runMutation(api.users.connectCoinbaseWallet, { address: body.address, network: "base" });
    return { success: true };
  });
});

export const listPaymentMethodsHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return { paymentMethods: await ctx.runQuery(api.payments.records.listPaymentMethods, {}) };
  });
});

export const attachPaymentMethodHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { stripePaymentMethodId?: unknown };
    if (typeof body.stripePaymentMethodId !== "string") throw new BridgeError("stripePaymentMethodId is required.", 400);
    return ctx.runAction(api.payments.stripe.attachPaymentMethod, { stripePaymentMethodId: body.stripePaymentMethodId });
  });
});

export const detachPaymentMethodHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { recordId?: unknown };
    if (typeof body.recordId !== "string") throw new BridgeError("recordId is required.", 400);
    await ctx.runAction(api.payments.stripe.detachPaymentMethod, {
      recordId: requireConvexId<"paymentMethods">(body.recordId, "recordId"),
    });
    return { success: true };
  });
});

// ---- Checkout: quote → biometric confirm → off-session charge -------------

export const acquireCheckoutAttemptHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { listingId?: unknown; listing?: unknown; quantity?: unknown; idempotencyKey?: unknown };
    if (typeof body.listingId !== "string" || !body.listingId.trim()) throw new BridgeError("listingId is required.", 400);
    if (typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) throw new BridgeError("idempotencyKey is required.", 400);
    const quantity = typeof body.quantity === "number" && Number.isInteger(body.quantity) ? body.quantity : 1;
    // The domain mutation's validator fully validates the listing snapshot.
    const attemptId = await ctx.runMutation(api.commerce.checkout.acquireCheckoutAttempt, {
      listingId: body.listingId,
      listing: requireListingSnapshot(body.listing),
      quantity,
      idempotencyKey: body.idempotencyKey,
    });
    return { attemptId };
  });
});

export const prepareCheckoutHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { attemptId?: unknown };
    if (typeof body.attemptId !== "string") throw new BridgeError("attemptId is required.", 400);
    return ctx.runAction(api.commerce.actions.prepareCheckout, {
      attemptId: requireConvexId<"checkoutAttempts">(body.attemptId, "attemptId"),
    });
  });
});

export const confirmCheckoutHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { attemptId?: unknown };
    if (typeof body.attemptId !== "string") throw new BridgeError("attemptId is required.", 400);
    return ctx.runAction(api.commerce.actions.confirmCheckout, {
      attemptId: requireConvexId<"checkoutAttempts">(body.attemptId, "attemptId"),
    });
  });
});

http.route({ path: "/api/account/me", method: "GET", handler: userMeHttp });
http.route({ path: "/api/account/preferences", method: "GET", handler: getPreferencesHttp });
http.route({ path: "/api/account/preferences", method: "POST", handler: setPreferencesHttp });
http.route({ path: "/api/account/bootstrap", method: "POST", handler: bootstrapUserHttp });
http.route({ path: "/api/account/profile", method: "POST", handler: updateUserProfileHttp });
http.route({ path: "/api/account/delete", method: "POST", handler: requestAccountDeletionHttp });
http.route({ path: "/api/account/delete", method: "GET", handler: accountDeletionStatusHttp });
http.route({ path: "/api/account/wallet/coinbase", method: "POST", handler: connectCoinbaseWalletHttp });
http.route({ path: "/api/payment-methods", method: "GET", handler: listPaymentMethodsHttp });
http.route({ path: "/api/payment-methods/attach", method: "POST", handler: attachPaymentMethodHttp });
http.route({ path: "/api/payment-methods/detach", method: "POST", handler: detachPaymentMethodHttp });
http.route({ path: "/api/checkout/attempt", method: "POST", handler: acquireCheckoutAttemptHttp });
http.route({ path: "/api/checkout/prepare", method: "POST", handler: prepareCheckoutHttp });
http.route({ path: "/api/checkout/confirm", method: "POST", handler: confirmCheckoutHttp });

// ---- Discovery: external-provider search + preference-derived feed --------

export const discoverySearchHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { query?: unknown; location?: unknown; radius?: unknown };
    if (typeof body.query !== "string" || !body.query.trim()) throw new BridgeError("query is required.", 400);
    return ctx.runAction(api.discovery.search, {
      query: body.query,
      ...(typeof body.location === "string" && body.location.trim() ? { location: body.location } : {}),
      ...(typeof body.radius === "number" && Number.isFinite(body.radius) ? { radius: body.radius } : {}),
    });
  });
});

export const discoveryRecommendationsHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runAction(api.discovery.recommendations, {});
  });
});

export const recordInteractionHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown; action?: unknown };
    if (typeof body.productId !== "string" || typeof body.action !== "string") {
      throw new BridgeError("productId and action are required.", 400);
    }
    await ctx.runMutation(api.telemetry.recordInteraction, {
      productId: body.productId,
      action: body.action,
    });
    return { success: true };
  });
});

export const liveTokenHttp = httpAction(async (ctx) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runAction(api.ai.liveToken.generateLiveApiToken, {});
  });
});

// ---- Orders: purchase tracking / history (not owned inventory) ------------

export const listOrdersHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 20, 50);
    const rows = await ctx.runQuery(api.commerce.checkout.listOrders, { limit });
    return {
      orders: rows.map((row: (typeof rows)[number]) => ({
        id: row._id,
        listingId: row.listingId,
        listing: row.listing,
        quantity: row.quantity,
        amountCents: row.amountCents,
        currency: row.currency,
        merchantUrl: row.merchantUrl,
        status: row.status,
        trackingStatus: row.trackingStatus,
        carrier: row.carrier,
        trackingNumber: row.trackingNumber,
        estimatedDelivery: row.estimatedDelivery,
        returnStatus: row.returnStatus,
        returnReason: row.returnReason,
        reminderSet: row.reminderSet,
        reminderTime: row.reminderTime,
        paymentMethod: row.paymentMethod,
        createdAt: row.createdAt,
      })),
    };
  });
});

export const setOrderReminderHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { orderId?: unknown; reminderTime?: unknown };
    if (typeof body.orderId !== "string" || !body.orderId.trim()) throw new BridgeError("orderId is required.", 400);
    if (typeof body.reminderTime !== "string" || !body.reminderTime.trim()) throw new BridgeError("reminderTime is required.", 400);
    await ctx.runMutation(api.commerce.checkout.setOrderReminder, {
      orderId: requireConvexId<"orders">(body.orderId, "orderId"),
      reminderTime: body.reminderTime,
    });
    return { success: true };
  });
});

export const acknowledgeDeliveryHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { orderId?: unknown };
    if (typeof body.orderId !== "string" || !body.orderId.trim()) throw new BridgeError("orderId is required.", 400);
    await ctx.runMutation(api.commerce.checkout.acknowledgeDelivery, {
      orderId: requireConvexId<"orders">(body.orderId, "orderId"),
    });
    return { success: true };
  });
});

export const requestReturnHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { orderId?: unknown; reason?: unknown; idempotencyKey?: unknown };
    if (typeof body.orderId !== "string" || !body.orderId.trim()) throw new BridgeError("orderId is required.", 400);
    const reason = typeof body.reason === "string" ? body.reason : "";
    const idempotencyKey =
      typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : `return:${body.orderId}:${reason.slice(0, 80)}`;
    await ctx.runMutation(api.commerce.checkout.requestReturn, {
      orderId: requireConvexId<"orders">(body.orderId, "orderId"),
      reason,
      idempotencyKey,
    });
    return { success: true };
  });
});

// ---- Cart: user-scoped snapshots of external listings ---------------------

export const listCartHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 100, 100);
    const rows = await ctx.runQuery(api.reactiveState.listCartItems, { limit });
    return { items: rows };
  });
});

export const addCartItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown; listing?: unknown; quantity?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) throw new BridgeError("productId is required.", 400);
    if (!body.listing || typeof body.listing !== "object") throw new BridgeError("A listing snapshot is required.", 400);
    const quantity = typeof body.quantity === "number" && Number.isInteger(body.quantity) ? body.quantity : 1;
    // The domain mutation's validator fully validates the listing snapshot.
    await ctx.runMutation(api.reactiveState.addCartItem, {
      productId: body.productId,
      listing: requireListingSnapshot(body.listing),
      quantity,
    });
    return { success: true };
  });
});

export const setCartQuantityHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown; quantity?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) throw new BridgeError("productId is required.", 400);
    if (typeof body.quantity !== "number" || !Number.isInteger(body.quantity)) throw new BridgeError("quantity must be an integer.", 400);
    await ctx.runMutation(api.reactiveState.setCartQuantity, { productId: body.productId, quantity: body.quantity });
    return { success: true };
  });
});

export const removeCartItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) throw new BridgeError("productId is required.", 400);
    await ctx.runMutation(api.reactiveState.removeCartItem, { productId: body.productId });
    return { success: true };
  });
});

// ---- Saved products: durable user bookmarks -------------------------------

export const listSavedHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 100, 100);
    const rows = await ctx.runQuery(api.reactiveState.listSavedProducts, { limit });
    return { items: rows };
  });
});

export const setSavedHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productId?: unknown; saved?: unknown; listing?: unknown };
    if (typeof body.productId !== "string" || !body.productId.trim()) throw new BridgeError("productId is required.", 400);
    if (typeof body.saved !== "boolean") throw new BridgeError("saved must be a boolean.", 400);
    const listing = optionalListingSnapshot(body.listing);
    await ctx.runMutation(api.reactiveState.setSavedProduct, {
      productId: body.productId,
      saved: body.saved,
      ...(listing ? { listing } : {}),
    });
    return { success: true };
  });
});

// ---- Wardrobe: user-owned photos/items and generated looks ----------------

export const listWardrobeHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 100, 100);
    const rows = await ctx.runQuery(api.reactiveState.listWardrobeItems, { limit });
    return { items: rows };
  });
});

export const addWardrobeItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const requiredStrings = ["clientId", "kind", "name", "category", "weatherSuitability", "image", "addedAt"];
    for (const field of requiredStrings) {
      if (typeof body[field] !== "string" && !(field === "addedAt" && typeof body[field] === "number")) {
        throw new BridgeError(`${field} is required.`, 400);
      }
    }
    if (body.kind !== "user_upload" && body.kind !== "bookmarked_product") {
      throw new BridgeError("Unsupported wardrobe item kind.", 400);
    }
    const allowedWeather = ["SUMMER_HEAT", "MILD_SPRING_AUTUMN", "WINTER_COLD", "ALL_WEATHER", "HOT_SUMMER", "COLD_WINTER"];
    if (!allowedWeather.includes(String(body.weatherSuitability))) {
      throw new BridgeError("Unsupported wardrobe weather classification.", 400);
    }
    await ctx.runMutation(api.reactiveState.addWardrobeItem, {
      clientId: String(body.clientId),
      kind: body.kind as "user_upload" | "bookmarked_product",
      name: String(body.name),
      category: String(body.category),
      weatherSuitability: body.weatherSuitability as "SUMMER_HEAT" | "MILD_SPRING_AUTUMN" | "WINTER_COLD" | "ALL_WEATHER" | "HOT_SUMMER" | "COLD_WINTER",
      image: String(body.image),
      ...(typeof body.brand === "string" ? { brand: body.brand } : {}),
      ...(typeof body.price === "number" ? { price: body.price } : {}),
      ...(typeof body.productId === "string" ? { productId: body.productId } : {}),
      addedAt: typeof body.addedAt === "number" ? body.addedAt : Date.now(),
      ...(typeof body.color === "string" ? { color: body.color } : {}),
      ...(typeof body.mediaKey === "string" ? { mediaKey: body.mediaKey } : {}),
      ...(typeof body.mediaAssetId === "string"
        ? { mediaAssetId: requireConvexId<"mediaAssets">(body.mediaAssetId, "mediaAssetId") }
        : {}),
    });
    return { success: true };
  });
});

export const removeWardrobeItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { clientId?: unknown };
    if (typeof body.clientId !== "string" || !body.clientId.trim()) throw new BridgeError("clientId is required.", 400);
    await ctx.runMutation(api.reactiveState.removeWardrobeItem, { clientId: body.clientId });
    return { success: true };
  });
});

export const listWardrobeOutfitsHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 100, 100);
    const rows = await ctx.runQuery(api.reactiveState.listWardrobeOutfits, { limit });
    return { outfits: rows };
  });
});

http.route({ path: "/api/media/upload", method: "POST", handler: uploadMediaHttp });
http.route({ path: "/api/media/read-url", method: "POST", handler: mediaReadUrlHttp });
http.route({ path: "/api/vision/search", method: "POST", handler: visionSearchHttp });
http.route({ path: "/api/media/try-on", method: "POST", handler: tryOnHttp });
http.route({ path: "/api/discovery/search", method: "POST", handler: discoverySearchHttp });
http.route({ path: "/api/discovery/recommendations", method: "POST", handler: discoveryRecommendationsHttp });
http.route({ path: "/api/interactions", method: "POST", handler: recordInteractionHttp });
http.route({ path: "/api/live/token", method: "POST", handler: liveTokenHttp });
http.route({ path: "/api/orders", method: "GET", handler: listOrdersHttp });
http.route({ path: "/api/orders/reminder", method: "POST", handler: setOrderReminderHttp });
http.route({ path: "/api/orders/acknowledge", method: "POST", handler: acknowledgeDeliveryHttp });
http.route({ path: "/api/orders/return", method: "POST", handler: requestReturnHttp });
http.route({ path: "/api/cart", method: "GET", handler: listCartHttp });
http.route({ path: "/api/cart/item", method: "POST", handler: addCartItemHttp });
http.route({ path: "/api/cart/quantity", method: "POST", handler: setCartQuantityHttp });
http.route({ path: "/api/cart/remove", method: "POST", handler: removeCartItemHttp });
http.route({ path: "/api/saved", method: "GET", handler: listSavedHttp });
http.route({ path: "/api/saved", method: "POST", handler: setSavedHttp });
http.route({ path: "/api/wardrobe", method: "GET", handler: listWardrobeHttp });
http.route({ path: "/api/wardrobe/item", method: "POST", handler: addWardrobeItemHttp });
http.route({ path: "/api/wardrobe/item/remove", method: "POST", handler: removeWardrobeItemHttp });
http.route({ path: "/api/wardrobe/outfits", method: "GET", handler: listWardrobeOutfitsHttp });
export const listCreatorTemplatesHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.creator.listCreatorTemplates, {});
  });
});

export const listCreatorAgentsHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.creator.listCreatorAgents, {});
  });
});

export const generateCreatorCampaignHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { productName?: unknown; campaignGoal?: unknown; targetAudience?: unknown };
    if (typeof body.productName !== "string" || typeof body.campaignGoal !== "string") {
      throw new BridgeError("productName and campaignGoal are required.", 400);
    }
    return ctx.runAction(api.aiGeneration.generateCreatorCampaign, {
      productName: body.productName,
      campaignGoal: body.campaignGoal,
      ...(typeof body.targetAudience === "string" ? { targetAudience: body.targetAudience } : {}),
    });
  });
});

http.route({ path: "/api/creator/templates", method: "GET", handler: listCreatorTemplatesHttp });
http.route({ path: "/api/creator/agents", method: "GET", handler: listCreatorAgentsHttp });
http.route({ path: "/api/creator/campaign", method: "POST", handler: generateCreatorCampaignHttp });

// ---- Grocery: user-scoped shopping list -----------------------------------

export const listGroceryHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.grocery.getMyList, {});
  });
});

export const addGroceryItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { name?: unknown; category?: unknown };
    if (typeof body.name !== "string" || !body.name.trim()) throw new BridgeError("name is required.", 400);
    await ctx.runMutation(api.grocery.addItem, {
      name: body.name,
      category: typeof body.category === "string" ? body.category : "Other",
    });
    return { success: true };
  });
});

export const setGroceryCheckedHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { itemId?: unknown; checked?: unknown };
    if (typeof body.itemId !== "string" || !body.itemId.trim()) throw new BridgeError("itemId is required.", 400);
    if (typeof body.checked !== "boolean") throw new BridgeError("checked must be a boolean.", 400);
    await ctx.runMutation(api.grocery.setChecked, {
      itemId: requireConvexId<"groceryItems">(body.itemId, "itemId"),
      checked: body.checked,
    });
    return { success: true };
  });
});

export const removeGroceryItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { itemId?: unknown };
    if (typeof body.itemId !== "string" || !body.itemId.trim()) throw new BridgeError("itemId is required.", 400);
    await ctx.runMutation(api.grocery.removeItem, {
      itemId: requireConvexId<"groceryItems">(body.itemId, "itemId"),
    });
    return { success: true };
  });
});

// ---- Agent conversations: shared cross-client thread boundary -------------

export const createChatThreadHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { title?: unknown };
    return {
      threadId: await ctx.runMutation(api.aiChat.createThread, {
        ...(typeof body.title === "string" && body.title.trim() ? { title: body.title } : {}),
      }),
    };
  });
});

export const listChatMessagesHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");
    if (!threadId?.trim()) throw new BridgeError("threadId is required.", 400);
    const result = await ctx.runQuery(api.aiChat.listMessages, {
      threadId,
      paginationOpts: { cursor: null, numItems: boundedInt(queryInt(request, "limit"), 50, 100) },
      streamArgs: { kind: "list" },
    });
    const streamMessages =
      result.streams && result.streams.kind === "list"
        ? result.streams.messages
        : [];
    if (streamMessages.length === 0) return result;
    const deltas = await ctx.runQuery(api.aiChat.listStreamDeltas, {
      threadId,
      cursors: streamMessages.map((stream: { streamId: string }) => ({ streamId: stream.streamId, cursor: 0 })),
    });
    return { ...result, streamMetadata: streamMessages, streams: { kind: "deltas", deltas } };
  });
});

export const sendChatMessageHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { threadId?: unknown; prompt?: unknown };
    if (typeof body.threadId !== "string" || !body.threadId.trim()) throw new BridgeError("threadId is required.", 400);
    if (typeof body.prompt !== "string" || !body.prompt.trim()) throw new BridgeError("prompt is required.", 400);
    await ctx.runMutation(api.aiChat.sendMessage, { threadId: body.threadId, prompt: body.prompt });
    return { accepted: true };
  });
});

http.route({ path: "/api/chat/thread", method: "POST", handler: createChatThreadHttp });
http.route({ path: "/api/chat/messages", method: "GET", handler: listChatMessagesHttp });
http.route({ path: "/api/chat/message", method: "POST", handler: sendChatMessageHttp });

export const generateWardrobeOutfitHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as {
      idempotencyKey?: unknown;
      items?: unknown;
      weatherCondition?: unknown;
      temperatureText?: unknown;
    };
    if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 8) {
      throw new BridgeError("A valid idempotencyKey is required.", 400);
    }
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
      throw new BridgeError("At least one wardrobe item is required.", 400);
    }
    if (typeof body.weatherCondition !== "string" || typeof body.temperatureText !== "string") {
      throw new BridgeError("Weather context is required.", 400);
    }
    const allowedWeather = ["SUMMER_HEAT", "MILD_SPRING_AUTUMN", "WINTER_COLD", "ALL_WEATHER", "HOT_SUMMER", "COLD_WINTER"];
    const weatherCondition = body.weatherCondition.trim().toUpperCase().replace(/ /g, "_");
    if (!allowedWeather.includes(weatherCondition)) throw new BridgeError("Unsupported weather condition.", 400);
    const items = body.items.map((item) => {
      if (!item || typeof item !== "object") throw new BridgeError("Invalid wardrobe item.", 400);
      const value = item as Record<string, unknown>;
      if (["id", "name", "category", "weatherSuitability", "image"].some((key) => typeof value[key] !== "string")) {
        throw new BridgeError("Invalid wardrobe item.", 400);
      }
      return {
        id: value.id as string,
        name: value.name as string,
        category: value.category as string,
        weatherSuitability: value.weatherSuitability as "SUMMER_HEAT" | "MILD_SPRING_AUTUMN" | "WINTER_COLD" | "ALL_WEATHER" | "HOT_SUMMER" | "COLD_WINTER",
        image: value.image as string,
      };
    });
    return ctx.runAction(api.aiGeneration.generateOutfit, {
      idempotencyKey: body.idempotencyKey,
      items,
      weatherCondition: weatherCondition as "SUMMER_HEAT" | "MILD_SPRING_AUTUMN" | "WINTER_COLD" | "ALL_WEATHER" | "HOT_SUMMER" | "COLD_WINTER",
      temperatureText: body.temperatureText,
    });
  });
});

http.route({ path: "/api/wardrobe/outfit", method: "POST", handler: generateWardrobeOutfitHttp });

// ---- Travel: user-scoped trips --------------------------------------------

export const listTripsHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    return ctx.runQuery(api.travel.listTrips, {});
  });
});

export const listTripDetailHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const tripId = new URL(request.url).searchParams.get("tripId");
    if (!tripId || !tripId.trim()) throw new BridgeError("tripId is required.", 400);
    return ctx.runQuery(api.travel.listTripDetail, {
      tripId: requireConvexId<"travelTrips">(tripId, "tripId"),
    });
  });
});

export const addTravelExpenseHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { tripId?: unknown; amount?: unknown; currency?: unknown; category?: unknown; merchant?: unknown };
    if (typeof body.tripId !== "string" || !body.tripId.trim()) throw new BridgeError("tripId is required.", 400);
    if (typeof body.amount !== "number" || typeof body.currency !== "string" || typeof body.category !== "string" || typeof body.merchant !== "string") {
      throw new BridgeError("A complete expense is required.", 400);
    }
    await ctx.runMutation(api.travel.addExpense, {
      tripId: requireConvexId<"travelTrips">(body.tripId, "tripId"),
      amount: body.amount,
      currency: body.currency,
      category: requireExpenseCategory(body.category),
      merchant: body.merchant,
    });
    return { success: true };
  });
});

export const parseTravelReceiptHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { receiptMediaKey?: unknown };
    if (typeof body.receiptMediaKey !== "string" || !body.receiptMediaKey.trim()) {
      throw new BridgeError("receiptMediaKey is required.", 400);
    }
    return ctx.runAction(api.travel.parseReceiptImage, { receiptMediaKey: body.receiptMediaKey });
  });
});

http.route({ path: "/api/grocery", method: "GET", handler: listGroceryHttp });
http.route({ path: "/api/grocery/item", method: "POST", handler: addGroceryItemHttp });
http.route({ path: "/api/grocery/checked", method: "POST", handler: setGroceryCheckedHttp });
http.route({ path: "/api/grocery/remove", method: "POST", handler: removeGroceryItemHttp });
http.route({ path: "/api/travel/trips", method: "GET", handler: listTripsHttp });
http.route({ path: "/api/travel/detail", method: "GET", handler: listTripDetailHttp });
http.route({ path: "/api/travel/expense", method: "POST", handler: addTravelExpenseHttp });
http.route({ path: "/api/travel/receipt", method: "POST", handler: parseTravelReceiptHttp });

// ---- Context: weather classification for wardrobe/outfit flows ------------
// The climate lookup runs server-side so clients never call the weather
// provider directly; the app consumes one Convex-bridged context contract.

function climateCategory(celsius: number): string {
  if (celsius < 10) return "Winter";
  if (celsius > 25) return "Summer";
  return "Occasion";
}

export const weatherContextHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const params = new URL(request.url).searchParams;
    const latitude = Number(params.get("latitude"));
    const longitude = Number(params.get("longitude"));
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new BridgeError("latitude must be between -90 and 90.", 400);
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new BridgeError("longitude must be between -180 and 180.", 400);
    }
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const payload = (await fetch(url).then((res) => {
      if (!res.ok) throw new BridgeError("Weather provider request failed.", 502);
      return res.json();
    })) as { current_weather?: { temperature?: unknown } };
    const celsius = payload.current_weather?.temperature;
    if (typeof celsius !== "number" || !Number.isFinite(celsius)) {
      throw new BridgeError("Weather provider returned no temperature.", 502);
    }
    return {
      climate: climateCategory(celsius),
      temperatureCelsius: Math.round(celsius * 10) / 10,
      temperatureText: `${Math.round(celsius * 10) / 10}°C`,
    };
  });
});

// ---- Infrastructure health -------------------------------------------------
// Unauthenticated liveness/readiness endpoint used by deployment smoke tests.
// 503 is an expected, healthy status for a real readiness check: it means the
// deployment is reachable but a required dependency is misconfigured.
export const healthHttp = httpAction(async () => {
  const dependencies: Record<string, string> = {};
  let ready = true;
  const convexUrl = process.env.CONVEX_CLOUD_URL ?? process.env.CONVEX_DEPLOYMENT_URL;
  if (convexUrl) {
    dependencies.convexDeployment = "configured";
  } else {
    dependencies.convexDeployment = "missing";
    ready = false;
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    dependencies.stripe = "missing";
    ready = false;
  } else {
    dependencies.stripe = "configured";
  }
  const body = ready
    ? { status: "ready", dependencies }
    : { status: "degraded", dependencies };
  return responseJson(ready ? 200 : 503, body);
});

http.route({ path: "/api/health", method: "GET", handler: healthHttp });
http.route({ path: "/api/context/weather", method: "GET", handler: weatherContextHttp });

export default http;
