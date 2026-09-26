/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, components } from "../_generated/api";
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

test("saveLiveTurn persists finalized transcripts in the canonical Agent thread once", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  const request = {
    threadId,
    turnId: "session_1",
    userTranscript: "Find a red jacket.",
    assistantTranscript: "I found a few options.",
  };

  const first = await t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, request);
  const replay = await t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, request);
  const stored = await t.run(async (ctx) =>
    ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: 20 },
    }),
  );

  expect(first).toMatchObject({ saved: true, threadId });
  expect(first.userMessageId).toBeTruthy();
  expect(first.assistantMessageId).toBeTruthy();
  expect(replay).toMatchObject({
    saved: false,
    threadId,
    userMessageId: first.userMessageId,
    assistantMessageId: first.assistantMessageId,
  });
  expect(stored.page).toHaveLength(2);
  expect(stored.page.map(({ message }) => [message?.role, typeof message?.content === "string" ? message.content : "<non-text>"])).toEqual([
    ["user", "Find a red jacket."],
    ["assistant", "I found a few options."],
  ]);
});

test("saveLiveTurn appends each turn in request order", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  for (const [turnId, userTranscript, assistantTranscript] of [
    ["session_1", "First request", "First response"],
    ["session_2", "Second request", "Second response"],
  ]) {
    await t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, {
      threadId,
      turnId,
      userTranscript,
      assistantTranscript,
    });
  }

  const stored = await t.run(async (ctx) =>
    ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
      threadId,
      order: "asc",
      paginationOpts: { cursor: null, numItems: 20 },
    }),
  );

  expect(stored.page.map(({ message }) => typeof message?.content === "string" ? message.content : "<non-text>")).toEqual([
    "First request",
    "First response",
    "Second request",
    "Second response",
  ]);
});

test("late final input updates only its owner’s already saved live turn", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  const saved = await t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, {
    threadId,
    turnId: "session_late",
    userTranscript: "Find a",
    assistantTranscript: "Here is a match",
  });
  const updated = await t.withIdentity(identityA).mutation(api.aiChat.updateLiveTurnUserTranscript, {
    threadId,
    turnId: "session_late",
    userTranscript: "Find a waterproof jacket",
  });
  const replay = await t.withIdentity(identityA).mutation(api.aiChat.updateLiveTurnUserTranscript, {
    threadId,
    turnId: "session_late",
    userTranscript: "Find a waterproof jacket",
  });
  const stale = await t.withIdentity(identityA).mutation(api.aiChat.updateLiveTurnUserTranscript, {
    threadId,
    turnId: "session_late",
    userTranscript: "Find a red jacket",
  });
  expect(await t.withIdentity(identityA).mutation(api.aiChat.updateLiveTurnUserTranscript, {
    threadId,
    turnId: "session_late",
    userTranscript: "   ",
  })).toEqual({ updated: false, threadId });
  await expect(t.withIdentity(identityB).mutation(api.aiChat.updateLiveTurnUserTranscript, {
    threadId,
    turnId: "session_late",
    userTranscript: "read another user's transcript",
  })).rejects.toThrow(/forbidden|ownership/i);

  const stored = await t.run(async (ctx) => ctx.runQuery(components.agent.messages.getMessagesByIds, {
    messageIds: [saved.userMessageId!, saved.assistantMessageId!],
  }));
  expect(updated).toEqual({ updated: true, threadId });
  expect(replay).toEqual({ updated: true, threadId });
  expect(stale).toEqual({ updated: false, threadId });
  expect(stored.map((message) => typeof message?.message?.content === "string" ? message.message.content : "<non-text>")).toEqual([
    "Find a waterproof jacket",
    "Here is a match",
  ]);
});

test("saveLiveTurn rejects cross-user writes, blank turns, and invalid identifiers", async () => {
  const t = testConvex();
  const threadId = await t.withIdentity(identityA).mutation(api.aiChat.createThread, {});
  await expect(
    t.withIdentity(identityB).mutation(api.aiChat.saveLiveTurn, {
      threadId,
      turnId: "foreign",
      userTranscript: "private transcript",
      assistantTranscript: "private response",
    }),
  ).rejects.toThrow(/forbidden|ownership/i);
  await expect(
    t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, {
      threadId,
      turnId: "blank",
      userTranscript: "  ",
      assistantTranscript: "  ",
    }),
  ).rejects.toThrow();
  await expect(
    t.withIdentity(identityA).mutation(api.aiChat.saveLiveTurn, {
      threadId,
      turnId: "not valid",
      userTranscript: "hello",
      assistantTranscript: "",
    }),
  ).rejects.toThrow();
});
