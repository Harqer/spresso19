import Stripe from "stripe";
import { httpAction, env } from "./_generated/server";
import { httpRouter } from "convex/server";
import { internal, api } from "./_generated/api";

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

function responseJson(status: number, body: Record<string, unknown>): Response {
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
  const stripe = new Stripe(stripeSecret(), { apiVersion: "2025-01-27.acacia" as any });
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
    return ctx.runAction(api.media.actions.createPrivateReadUrl, { assetId: body.assetId as any });
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
    const personImage = await ctx.runAction(api.media.actions.createPrivateReadUrl, { assetId: body.mediaAssetId as any });
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

class BridgeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
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
    return responseJson(200, (value ?? {}) as Record<string, unknown>);
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

// ---- Orders: purchase tracking / history (not owned inventory) ------------

export const listOrdersHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const limit = boundedInt(queryInt(request, "limit"), 20, 50);
    const rows = await ctx.runQuery(api.commerce.checkout.listOrders, { limit });
    return {
      orders: rows.map((row) => ({
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
      orderId: body.orderId as any,
      reminderTime: body.reminderTime,
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
      orderId: body.orderId as any,
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
      listing: body.listing as any,
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
    await ctx.runMutation(api.reactiveState.setSavedProduct, {
      productId: body.productId,
      saved: body.saved,
      ...(body.listing && typeof body.listing === "object" ? { listing: body.listing as any } : {}),
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
      ...(typeof body.mediaAssetId === "string" ? { mediaAssetId: body.mediaAssetId as any } : {}),
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
http.route({ path: "/api/orders", method: "GET", handler: listOrdersHttp });
http.route({ path: "/api/orders/reminder", method: "POST", handler: setOrderReminderHttp });
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

http.route({ path: "/api/creator/templates", method: "GET", handler: listCreatorTemplatesHttp });
http.route({ path: "/api/creator/agents", method: "GET", handler: listCreatorAgentsHttp });

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
    await ctx.runMutation(api.grocery.setChecked, { itemId: body.itemId as any, checked: body.checked });
    return { success: true };
  });
});

export const removeGroceryItemHttp = httpAction(async (ctx, request) => {
  return runBridge(async () => {
    await bearerIdentity(ctx);
    const body = (await request.json().catch(() => ({}))) as { itemId?: unknown };
    if (typeof body.itemId !== "string" || !body.itemId.trim()) throw new BridgeError("itemId is required.", 400);
    await ctx.runMutation(api.grocery.removeItem, { itemId: body.itemId as any });
    return { success: true };
  });
});

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
    return ctx.runQuery(api.travel.listTripDetail, { tripId: tripId as any });
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
      tripId: body.tripId as any,
      amount: body.amount,
      currency: body.currency,
      category: body.category as any,
      merchant: body.merchant,
    });
    return { success: true };
  });
});

http.route({ path: "/api/grocery", method: "GET", handler: listGroceryHttp });
http.route({ path: "/api/grocery/item", method: "POST", handler: addGroceryItemHttp });
http.route({ path: "/api/grocery/checked", method: "POST", handler: setGroceryCheckedHttp });
http.route({ path: "/api/grocery/remove", method: "POST", handler: removeGroceryItemHttp });
http.route({ path: "/api/travel/trips", method: "GET", handler: listTripsHttp });
http.route({ path: "/api/travel/detail", method: "GET", handler: listTripDetailHttp });
http.route({ path: "/api/travel/expense", method: "POST", handler: addTravelExpenseHttp });

export default http;
