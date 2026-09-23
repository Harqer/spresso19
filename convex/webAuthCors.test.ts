/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const origin = "https://get-spresso.web.app";

test("production browser can preflight Firebase bearer authentication", async () => {
  const t = convexTest(schema, modules);
  const response = await t.fetch("/api/account/me", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,x-firebase-appcheck",
    },
  });
  expect(response.status).toBe(204);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  expect(response.headers.get("Access-Control-Allow-Headers")?.toLowerCase()).toContain("authorization");
  expect(response.headers.get("Access-Control-Allow-Headers")?.toLowerCase()).toContain("x-firebase-appcheck");
});

test("auth failure is readable by the approved browser without granting access", async () => {
  const response = await convexTest(schema, modules).fetch("/api/account/me", { headers: { Origin: origin } });
  expect(response.status).toBe(401);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
});

test("unapproved browser origins cannot invoke account operations", async () => {
  const response = await convexTest(schema, modules).fetch("/api/account/bootstrap", {
    method: "POST",
    headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
    body: "{}",
  });
  expect(response.status).toBe(403);
  expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
});

test("native requests without Origin still reach Firebase authentication", async () => {
  const response = await convexTest(schema, modules).fetch("/api/account/me");
  expect(response.status).toBe(401);
});

test("Stripe webhook still checks its signature without a browser origin", async () => {
  const response = await convexTest(schema, modules).fetch("/stripe_webhook", { method: "POST", body: "{}" });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: "Missing stripe-signature header." });
});
