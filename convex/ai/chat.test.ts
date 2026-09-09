/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";
import agentComponent from "@convex-dev/agent/test";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("../**/*.ts");
const identityA = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "ai-user-a",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:ai-user-a",
};
const identityB = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "ai-user-b",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:ai-user-b",
};

function testConvex() {
  const t = convexTest(schema, modules);
  agentComponent.register(t);
  rateLimiterComponent.register(t);
  return t;
}

test("createThread derives ownership from the verified identity", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, { title: "Discovery" });
  const result = await t.withIdentity(identityA).query(api.aiChat.getThread, { threadId });
  expect(result).toMatchObject({ threadId, title: "Discovery" });
});

test("thread metadata is not readable by another user", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  await expect(t.withIdentity(identityB).query(api.aiChat.getThread, { threadId })).rejects.toThrow(/forbidden|ownership/i);
});

test("sendMessage rejects blank and oversized prompts before persistence", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  await expect(t.withIdentity(identityA).mutation(api.aiChat.sendMessage, { threadId, prompt: "   " })).rejects.toThrow();
  await expect(t.withIdentity(identityA).mutation(api.aiChat.sendMessage, { threadId, prompt: "x".repeat(4001) })).rejects.toThrow();
});
