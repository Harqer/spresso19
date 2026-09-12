import assert from "node:assert/strict";
import test from "node:test";
import { classifyWebApiError, webApiErrorResponse, WebApiError, WEB_API_ROUTES } from "../src/webapi";

test("enumerates every authenticated and public web API route", () => {
  assert.deepEqual(WEB_API_ROUTES, [
    { name: "health", path: "/health", methods: ["GET"] },
    { name: "userSync", path: "/user/sync", methods: ["POST"] },
    { name: "userPreferences", path: "/user/preferences", methods: ["GET", "POST"] },
    { name: "coinbaseWallet", path: "/user/wallet/coinbase", methods: ["POST"] },
    { name: "cart", path: "/cart", methods: ["GET", "POST"] },
    { name: "orders", path: "/orders", methods: ["GET"] },
    { name: "products", path: "/products", methods: ["GET"] },
    { name: "product", path: "/products/:productId", methods: ["GET"] },
  ]);
});

test("preserves explicit authentication and authorization status classes", () => {
  assert.equal(classifyWebApiError({ status: 401 }).category, "authentication");
  assert.equal(classifyWebApiError({ status: 401 }).status, 401);
  assert.equal(classifyWebApiError({ status: 403 }).category, "authorization");
  assert.equal(classifyWebApiError({ code: "permission-denied" }).status, 403);
});

test("maps conflicts, rate limits, timeouts, and unavailable dependencies", () => {
  assert.equal(classifyWebApiError({ code: "already-exists" }).status, 409);
  assert.equal(classifyWebApiError({ code: "resource-exhausted" }).status, 429);
  assert.equal(classifyWebApiError({ code: "deadline-exceeded" }).status, 504);
  assert.equal(classifyWebApiError({ code: "unavailable" }).status, 503);
  assert.equal(classifyWebApiError({ status: 502 }).category, "dependency_unavailable");
});

test("maps malformed, not-found, method, and unexpected errors to explicit responses", () => {
  const methodError = new WebApiError({
    category: "method_not_allowed",
    status: 405,
    message: "Method not allowed.",
    allowMethods: "GET, POST",
  });
  assert.deepEqual(webApiErrorResponse(methodError), {
    status: 405,
    body: { success: false, error: "Method not allowed." },
    allowMethods: "GET, POST",
  });
  assert.equal(classifyWebApiError({ status: 400 }).status, 400);
  assert.equal(classifyWebApiError(new WebApiError({ category: "not_found", status: 404, message: "Route not found." })).status, 404);
  assert.equal(classifyWebApiError(new Error("database failed")).status, 500);
});

test("never exposes dependency or credential details in public errors", () => {
  const response = webApiErrorResponse(new Error("Bearer secret-token database password"));
  assert.equal(response.status, 500);
  assert.equal(response.body.error.includes("secret-token"), false);
  assert.equal(response.body.error.includes("password"), false);
});
