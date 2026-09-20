/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import agent from "@convex-dev/agent/test";
import rateLimiter from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("./**/*.ts");

// Identity fixtures mirror what Convex injects after validating a JWT against
// convex/auth.config.ts. These pin the contract the identity helper relies on.
const validIdentity = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-123",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-123",
};

test("requireFirebaseIdentity: missing identity is rejected", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  await expect(t.query(api.users.me, {})).rejects.toThrow(/[Uu]nauthenticated/);
});

test("requireFirebaseIdentity: anonymous (no identity) cannot read profile", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  await expect(t.query(api.users.me, {})).rejects.toThrow();
});

test("requireFirebaseIdentity: wrong issuer is rejected", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  const foreign = t.withIdentity({
    issuer: "https://evil.example.com",
    subject: "firebase-uid-123",
    tokenIdentifier: "https://evil.example.com:firebase-uid-123",
  });
  await expect(foreign.query(api.users.me, {})).rejects.toThrow(/issuer/);
});

test("requireFirebaseIdentity: valid Firebase identity reads own profile (null when absent)", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  const authed = t.withIdentity(validIdentity);
  const result = await authed.query(api.users.me, {});
  expect(result).toBeNull();
});

test("ensureUser: creates, deduplicates by tokenIdentifier, and is readable by owner", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  const authed = t.withIdentity(validIdentity);

  const first = await authed.mutation(internal.users.ensureUser, { displayName: "Shopper" });
  const second = await authed.mutation(internal.users.ensureUser, { displayName: "Shopper" });
  expect(first).toBe(second);

  const profile = await authed.query(api.users.me, {});
  expect(profile).toMatchObject({ firebaseUid: "firebase-uid-123", displayName: "Shopper" });
});

test("ensureUser: cross-user isolation — one identity cannot read another's profile", async () => {
  const t = convexTest(schema, modules);
  agent.register(t);
  rateLimiter.register(t);
  const authA = t.withIdentity(validIdentity);
  const authB = t.withIdentity({
    ...validIdentity,
    subject: "firebase-uid-456",
    tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-456",
  });

  await authA.mutation(internal.users.ensureUser, {});
  const profileB = await authB.query(api.users.me, {});
  expect(profileB).toBeNull();
});
