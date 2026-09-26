/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, components } from "./_generated/api";
import schema from "./schema";
import agentComponent from "@convex-dev/agent/test";
import rateLimiterComponent from "@convex-dev/rate-limiter/test";

const modules = import.meta.glob("./**/*.ts");
const identityA = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "live-http-a",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:live-http-a",
};
const identityB = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "live-http-b",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:live-http-b",
};

function testConvex() {
  const t = convexTest(schema, modules);
  agentComponent.register(t);
  rateLimiterComponent.register(t);
  return t;
}

function postTurn(
  t: ReturnType<typeof testConvex>,
  tokenIdentifier: string | null,
  body: string,
) {
  const fetcher = tokenIdentifier === identityA.tokenIdentifier
    ? t.withIdentity(identityA)
    : tokenIdentifier === identityB.tokenIdentifier
      ? t.withIdentity(identityB)
      : t;
  return fetcher.fetch(body.includes('"assistantTranscript"') ? "/api/chat/live-turn" : "/api/chat/live-turn/input", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("live-turn HTTP validates a plain object body and returns 400 for malformed shapes", async () => {
  const t = testConvex();
  for (const body of ["null", "[]", "false", "\"text\"", "{"]) {
    const response = await t.withIdentity(identityA).fetch("/api/chat/live-turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect(response.status).toBe(400);
  }
});

test("live-turn HTTP requires auth and delegates owner/idempotency checks to the mutation", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  const requestBody = JSON.stringify({
    threadId,
    turnId: "live_http_1",
    userTranscript: "Find a waterproof jacket",
    assistantTranscript: "Here are current options",
  });

  expect((await postTurn(t, null, requestBody)).status).toBe(401);
  expect((await postTurn(t, identityB.tokenIdentifier, requestBody)).status).toBe(403);
  const first = await postTurn(t, identityA.tokenIdentifier, requestBody);
  const replay = await postTurn(t, identityA.tokenIdentifier, requestBody);
  expect(first.status).toBe(200);
  expect(replay.status).toBe(200);
  expect(await first.json()).toMatchObject({ saved: true, threadId });
  expect(await replay.json()).toMatchObject({ saved: false, threadId });
  const lateInput = await postTurn(t, identityA.tokenIdentifier, JSON.stringify({
    threadId,
    turnId: "live_http_1",
    userTranscript: "Find a waterproof jacket near me",
  }));
  expect(lateInput.status).toBe(200);
  expect(await lateInput.json()).toMatchObject({ updated: true, threadId });
  const staleInput = await postTurn(t, identityA.tokenIdentifier, JSON.stringify({
    threadId,
    turnId: "live_http_1",
    userTranscript: "Something unrelated",
  }));
  expect(staleInput.status).toBe(409);

  const stored = await t.run(async (ctx) => ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
    threadId,
    order: "asc",
    paginationOpts: { cursor: null, numItems: 20 },
  }));
  expect(stored.page.map(({ message }) => message?.content)).toEqual([
    "Find a waterproof jacket near me",
    "Here are current options",
  ]);
});
