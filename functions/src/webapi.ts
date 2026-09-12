import { onRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getAppCheck } from "firebase-admin/app-check";
import { db } from "./shared/db";
import { orderCollectionRef } from "./shared/orderRefs";
import { parseWebCart } from "./cart/webCart";

type Request = import("express").Request;
type Response = import("express").Response;

type WebApiErrorCategory =
  | "authentication"
  | "authorization"
  | "malformed_request"
  | "conflict"
  | "rate_limited"
  | "timeout"
  | "dependency_unavailable"
  | "method_not_allowed"
  | "not_found"
  | "internal";

type WebApiErrorOptions = {
  category: WebApiErrorCategory;
  message: string;
  status: number;
  allowMethods?: string;
};

type ErrorLike = {
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  name?: unknown;
};

export class WebApiError extends Error {
  readonly category: WebApiErrorCategory;
  readonly status: number;
  readonly publicMessage: string;
  readonly allowMethods?: string;

  constructor(options: WebApiErrorOptions) {
    super(options.message);
    this.name = "WebApiError";
    this.category = options.category;
    this.status = options.status;
    this.publicMessage = options.message;
    this.allowMethods = options.allowMethods;
  }
}

export const HOSTING_ORIGINS = ["https://get-spresso.web.app", "https://get-spresso.firebaseapp.com"];

export const WEB_API_ROUTES = [
  { name: "health", path: "/health", methods: ["GET"] },
  { name: "userSync", path: "/user/sync", methods: ["POST"] },
  { name: "userPreferences", path: "/user/preferences", methods: ["GET", "POST"] },
  { name: "coinbaseWallet", path: "/user/wallet/coinbase", methods: ["POST"] },
  { name: "cart", path: "/cart", methods: ["GET", "POST"] },
  { name: "orders", path: "/orders", methods: ["GET"] },
  { name: "products", path: "/products", methods: ["GET"] },
  { name: "product", path: "/products/:productId", methods: ["GET"] },
] as const;

type WebApiRoute = (typeof WEB_API_ROUTES)[number];

const INVALID_AUTH_CODES = new Set([
  "auth/argument-error",
  "auth/id-token-expired",
  "auth/id-token-revoked",
  "auth/invalid-id-token",
  "auth/user-disabled",
]);

const INVALID_APP_CHECK_CODES = new Set([
  "app-check/argument-error",
  "app-check/invalid-argument",
  "app-check/invalid-token",
]);

function webApiError(options: WebApiErrorOptions): WebApiError {
  return new WebApiError(options);
}

function malformed(message: string): WebApiError {
  return webApiError({ category: "malformed_request", status: 400, message });
}

function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").replace(/^api\//, "");
}

function routeForPath(path: string): WebApiRoute | null {
  const normalizedPath = normalizePath(path);
  const parts = normalizedPath.split("/").filter(Boolean);

  if (normalizedPath === "health") return WEB_API_ROUTES[0];
  if (normalizedPath === "user/sync") return WEB_API_ROUTES[1];
  if (normalizedPath === "user/preferences") return WEB_API_ROUTES[2];
  if (normalizedPath === "user/wallet/coinbase") return WEB_API_ROUTES[3];
  if (normalizedPath === "cart") return WEB_API_ROUTES[4];
  if (normalizedPath === "orders") return WEB_API_ROUTES[5];
  if (parts[0] === "products" && parts.length === 1) return WEB_API_ROUTES[6];
  if (parts[0] === "products" && parts.length === 2) return WEB_API_ROUTES[7];
  return null;
}

export function webApiErrorResponse(error: unknown): {
  status: number;
  body: { success: false; error: string };
  allowMethods?: string;
} {
  const normalized = classifyWebApiError(error);
  return {
    status: normalized.status,
    body: { success: false, error: normalized.publicMessage },
    ...(normalized.allowMethods ? { allowMethods: normalized.allowMethods } : {}),
  };
}

export function classifyWebApiError(error: unknown): WebApiError {
  if (error instanceof WebApiError) return error;

  const candidate = isErrorLike(error) ? error : {};
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const numericCode = typeof candidate.code === "number" ? candidate.code : undefined;
  const status = numericStatus(candidate.status ?? candidate.statusCode);

  if (status === 401) return webApiError({ category: "authentication", status, message: "Authentication is required." });
  if (status === 403) return webApiError({ category: "authorization", status, message: "This request is not authorized." });
  if (status === 400) return malformed("The request is invalid.");
  if (status === 409) return webApiError({ category: "conflict", status, message: "The request conflicts with existing state." });
  if (status === 429) return webApiError({ category: "rate_limited", status, message: "Too many requests. Please try again later." });
  if (status === 408 || status === 504) return webApiError({ category: "timeout", status: 504, message: "The request timed out. Please try again." });
  if (status !== undefined && status >= 500 && status <= 599) {
    return webApiError({ category: "dependency_unavailable", status, message: "The service is temporarily unavailable. Please try again." });
  }

  if (code === "already-exists" || code === "aborted" || code === "conflict" || numericCode === 6) {
    return webApiError({ category: "conflict", status: 409, message: "The request conflicts with existing state." });
  }
  if (code === "resource-exhausted" || code === "rate-limit-exceeded" || numericCode === 8) {
    return webApiError({ category: "rate_limited", status: 429, message: "Too many requests. Please try again later." });
  }
  if (code === "deadline-exceeded" || code === "timeout" || code === "etimedout" || numericCode === 4) {
    return webApiError({ category: "timeout", status: 504, message: "The request timed out. Please try again." });
  }
  if (code === "unavailable" || code === "failed-precondition" || code === "service-unavailable" || numericCode === 14) {
    return webApiError({ category: "dependency_unavailable", status: 503, message: "The service is temporarily unavailable. Please try again." });
  }
  if (code === "permission-denied" || numericCode === 7) {
    return webApiError({ category: "authorization", status: 403, message: "This request is not authorized." });
  }

  return webApiError({ category: "internal", status: 500, message: "An unexpected server error occurred." });
}

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === "object" && value !== null;
}

function numericStatus(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 400 && value <= 599 ? value : undefined;
}

function writeJson(res: Response, status: number, body: unknown, headers: Record<string, string> = {}): void {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.status(status).json(body);
}

function writeError(res: Response, error: unknown): void {
  const response = webApiErrorResponse(error);
  writeJson(
    res,
    response.status,
    response.body,
    response.allowMethods ? { Allow: response.allowMethods } : {},
  );
}

function requireMethod(route: WebApiRoute, method: string): void {
  if ((route.methods as readonly string[]).includes(method)) return;
  throw webApiError({
    category: "method_not_allowed",
    status: 405,
    message: "Method not allowed.",
    allowMethods: route.methods.join(", "),
  });
}

function bodyObject(req: Request): Record<string, unknown> {
  if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
    throw malformed("A JSON object body is required.");
  }
  return req.body as Record<string, unknown>;
}

function optionalString(body: Record<string, unknown>, field: string, maxLength: number): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw malformed(`${field} must be a string of at most ${maxLength} characters.`);
  }
  return value.trim();
}

function requireString(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = optionalString(body, field, maxLength);
  if (!value) throw malformed(`${field} is required.`);
  return value;
}

function optionalBoolean(body: Record<string, unknown>, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw malformed(`${field} must be a boolean.`);
  return value;
}

function optionalRadius(body: Record<string, unknown>): number | undefined {
  const value = body.radius;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1_000) {
    throw malformed("radius must be a number between 0 and 1,000.");
  }
  return value;
}

function optionalCoordinates(body: Record<string, unknown>): { lat: number; lng: number } | undefined {
  const value = body.coords;
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw malformed("coords must contain latitude and longitude.");
  const coords = value as Record<string, unknown>;
  if (typeof coords.lat !== "number" || !Number.isFinite(coords.lat) || coords.lat < -90 || coords.lat > 90) {
    throw malformed("coords.lat must be a valid latitude.");
  }
  if (typeof coords.lng !== "number" || !Number.isFinite(coords.lng) || coords.lng < -180 || coords.lng > 180) {
    throw malformed("coords.lng must be a valid longitude.");
  }
  return { lat: coords.lat, lng: coords.lng };
}

function preferencePatch(body: Record<string, unknown>): Record<string, unknown> {
  const theme = optionalString(body, "theme", 20);
  if (theme !== undefined && !["system", "light", "dark"].includes(theme)) throw malformed("theme is invalid.");
  const seedHex = optionalString(body, "seedHex", 7);
  if (seedHex !== undefined && !/^#[0-9a-f]{6}$/i.test(seedHex)) throw malformed("seedHex must be a six-digit hex color.");
  const secondarySeedHex = optionalString(body, "secondarySeedHex", 7);
  if (secondarySeedHex !== undefined && !/^#[0-9a-f]{6}$/i.test(secondarySeedHex)) throw malformed("secondarySeedHex must be a six-digit hex color.");
  const location = optionalString(body, "location", 200);
  const radius = optionalRadius(body);
  const coords = optionalCoordinates(body);
  const onboardingCompleted = optionalBoolean(body, "onboardingCompleted");
  const locationEnabled = optionalBoolean(body, "locationEnabled");
  const patch = { theme, seedHex, secondarySeedHex, location, radius, coords, onboardingCompleted, locationEnabled };
  const definedEntries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (definedEntries.length === 0) throw malformed("At least one preference is required.");
  return Object.fromEntries(definedEntries);
}

function isInvalidCredentialError(error: unknown, allowedCodes: Set<string>): boolean {
  return isErrorLike(error) && typeof error.code === "string" && allowedCodes.has(error.code.toLowerCase());
}

async function authenticate(req: Request): Promise<string> {
  const authorization = req.header("Authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.slice("Bearer ".length).trim().length === 0) {
    throw webApiError({ category: "authentication", status: 401, message: "Authentication is required." });
  }
  const token = authorization.slice("Bearer ".length).trim();
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    if (isInvalidCredentialError(error, INVALID_AUTH_CODES)) {
      throw webApiError({ category: "authentication", status: 401, message: "Authentication is required." });
    }
    throw webApiError({ category: "dependency_unavailable", status: 503, message: "Authentication is temporarily unavailable." });
  }
}

async function verifyAppCheck(req: Request): Promise<void> {
  const token = req.header("X-Firebase-AppCheck");
  if (!token) throw webApiError({ category: "authorization", status: 403, message: "This request is not authorized." });
  try {
    await getAppCheck().verifyToken(token);
  } catch (error) {
    if (isInvalidCredentialError(error, INVALID_APP_CHECK_CODES)) {
      throw webApiError({ category: "authorization", status: 403, message: "This request is not authorized." });
    }
    throw webApiError({ category: "dependency_unavailable", status: 503, message: "Request verification is temporarily unavailable." });
  }
}

async function checkHealth(): Promise<{ status: "ok" | "degraded"; dependencies: { firestore: "ok" | "error" } }> {
  try {
    await db.listCollections();
    return { status: "ok", dependencies: { firestore: "ok" } };
  } catch (error) {
    console.error("Health dependency check failed", { error });
    return { status: "degraded", dependencies: { firestore: "error" } };
  }
}

async function handleUserSync(req: Request, uid: string): Promise<{ success: true }> {
  const body = bodyObject(req);
  const email = optionalString(body, "email", 200) ?? "";
  const name = requireString(body, "name", 100);
  await db.collection("users").doc(uid).set({ email, displayName: name, updatedAt: new Date().toISOString() }, { merge: true });
  return { success: true };
}

async function handlePreferences(req: Request, uid: string): Promise<unknown> {
  const ref = db.collection("user_preferences").doc(uid);
  if (req.method === "GET") {
    const snapshot = await ref.get();
    const data = snapshot.data() || {};
    return {
      preferences: {
        theme: data.theme || "system",
        seedHex: data.seedHex || "",
        secondarySeedHex: data.secondarySeedHex || "",
        location: data.location || null,
        radius: data.radius || null,
        coords: data.coords || null,
        onboardingCompleted: data.onboardingCompleted || false,
        locationEnabled: data.locationEnabled || false,
      },
    };
  }
  const patch = preferencePatch(bodyObject(req));
  await ref.set(patch, { merge: true });
  return { success: true };
}

async function handleCoinbaseWallet(req: Request, uid: string): Promise<{ success: true }> {
  const body = bodyObject(req);
  const address = requireString(body, "address", 42);
  const network = body.network === undefined ? "base" : requireString(body, "network", 20);
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw malformed("A valid wallet address is required.");
  if (network !== "base" && network !== "ethereum") throw malformed("Unsupported wallet network.");
  await db.collection("users").doc(uid).set(
    { coinbaseWalletAddress: address, walletNetwork: network, walletConnectedAt: new Date().toISOString() },
    { merge: true },
  );
  return { success: true };
}

async function handleCart(req: Request, uid: string): Promise<unknown> {
  const ref = db.collection("carts").doc(uid);
  if (req.method === "GET") {
    const snapshot = await ref.get();
    try {
      const cart = parseWebCart({ cart: snapshot.data()?.items || [] });
      return { cart };
    } catch (error) {
      console.error("Malformed persisted cart state", { uid, error });
      throw malformed("A valid cart is required.");
    }
  }
  let items;
  try {
    items = parseWebCart(req.body);
  } catch {
    throw malformed("A valid cart is required.");
  }
  await ref.set({ userId: uid, items, updatedAt: new Date().toISOString() }, { merge: true });
  return { success: true, totalItems: items.reduce((sum, item) => sum + item.quantity, 0) };
}

async function handleOrders(uid: string): Promise<{ orders: unknown[] }> {
  const snapshot = await orderCollectionRef(uid).orderBy("createdAt", "desc").limit(50).get();
  return { orders: snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) };
}

async function handleProducts(req: Request, uid: string, parts: string[]): Promise<unknown> {
  const snapshot = await db.collection("discovered_listings").limit(100).get();
  const visibleListings: Array<{ id: string; [key: string]: unknown }> = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }) as { id: string; [key: string]: unknown })
    .filter((listing) => typeof listing.userId !== "string" || listing.userId === uid);
  if (parts.length === 1) return { products: visibleListings };

  const productId = parts[1];
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId)) throw malformed("A valid product ID is required.");
  const product = visibleListings.find((listing) => listing.id === productId);
  if (!product) throw webApiError({ category: "not_found", status: 404, message: "Product listing not found." });
  return { product };
}

async function dispatchAuthenticatedRequest(req: Request, uid: string, route: WebApiRoute, parts: string[]): Promise<unknown> {
  switch (route.name) {
    case "userSync": return handleUserSync(req, uid);
    case "userPreferences": return handlePreferences(req, uid);
    case "coinbaseWallet": return handleCoinbaseWallet(req, uid);
    case "cart": return handleCart(req, uid);
    case "orders": return handleOrders(uid);
    case "products":
    case "product": return handleProducts(req, uid, parts);
    default: throw webApiError({ category: "internal", status: 500, message: "An unexpected server error occurred." });
  }
}

export async function handleWebApiRequest(req: Request, res: Response): Promise<void> {
  const normalizedPath = normalizePath(req.path);
  const route = routeForPath(req.path);
  if (!route) {
    writeError(res, webApiError({ category: "not_found", status: 404, message: "Route not found." }));
    return;
  }

  try {
    requireMethod(route, req.method);
    if (route.name === "health") {
      const health = await checkHealth();
      writeJson(res, health.status === "ok" ? 200 : 503, health);
      return;
    }

    const uid = await authenticate(req);
    await verifyAppCheck(req);
    const parts = normalizedPath.split("/").filter(Boolean);
    const result = await dispatchAuthenticatedRequest(req, uid, route, parts);
    writeJson(res, 200, result);
  } catch (error) {
    writeError(res, error);
  }
}

export const webApi = onRequest(
  { cors: HOSTING_ORIGINS, maxInstances: 10 },
  async (req, res) => handleWebApiRequest(req, res),
);
