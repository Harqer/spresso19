import { getThreadMetadata, listUIMessages, saveMessage, saveMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { paginationOptsValidator } from "convex/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { v } from "convex/values";
import { requireFirebaseIdentity } from "./lib/identity";
import { ChatRequestSchema, LiveTurnRequestSchema } from "./ai/guardrails";
import { isTrialActive, trialWindow } from "./trial";

const rateLimiter = new RateLimiter(components.rateLimiter, {
  threadCreates: { kind: "token bucket", rate: 2, period: MINUTE, capacity: 2 },
  chatMessages: { kind: "token bucket", rate: 12, period: MINUTE, capacity: 4 },
  liveTurns: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 10 },
});

async function authorizeThread(
  ctx: Parameters<typeof getThreadMetadata>[0],
  threadId: string,
  tokenIdentifier: string,
) {
  const thread = await getThreadMetadata(ctx, components.agent, { threadId });
  if (thread.userId !== tokenIdentifier) {
    throw new Error("Forbidden: thread ownership check failed.");
  }
  return thread;
}

export const createThread = mutation({
  args: { title: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    const ensuredUserId = user ? null : await ctx.runMutation(internal.users.ensureUser, {});
    const currentUser = user ?? (ensuredUserId ? await ctx.db.get("users", ensuredUserId) : null);
    if (!currentUser || !isTrialActive(trialWindow(currentUser.createdAt, currentUser.trialStartedAt, currentUser.trialEndsAt))) {
      throw new Error("Your Spresso trial has ended. Choose a plan to continue.");
    }
    const allowed = await rateLimiter.limit(ctx, "threadCreates", { key: identity.tokenIdentifier });
    if (!allowed.ok) throw new Error("Chat request rate limit exceeded.");
    const { _id: threadId } = await ctx.runMutation(components.agent.threads.createThread, {
      userId: identity.tokenIdentifier,
      title: args.title?.trim().slice(0, 120) || "Spresso discovery",
    });
    return threadId;
  },
});

export const getThread = query({
  args: { threadId: v.string() },
  returns: v.object({
    threadId: v.string(),
    userId: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("archived")),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    const thread = await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    return {
      threadId: thread._id,
      userId: thread.userId,
      title: thread.title,
      summary: thread.summary,
      status: thread.status,
    };
  },
});

export const listMessages = query({
  args: { threadId: v.string(), paginationOpts: paginationOptsValidator, streamArgs: vStreamArgs },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

const streamCursor = v.object({ streamId: v.string(), cursor: v.number() });

export const listStreamDeltas = query({
  args: { threadId: v.string(), cursors: v.array(streamCursor) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    return ctx.runQuery(components.agent.streams.listDeltas, {
      threadId: args.threadId,
      cursors: args.cursors,
    });
  },
});

export const saveLiveTurn = mutation({
  args: {
    threadId: v.string(),
    turnId: v.string(),
    userTranscript: v.string(),
    assistantTranscript: v.string(),
  },
  returns: v.object({
    saved: v.boolean(),
    threadId: v.string(),
    userMessageId: v.optional(v.string()),
    assistantMessageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    const input = LiveTurnRequestSchema.parse({
      turnId: args.turnId,
      userTranscript: args.userTranscript,
      assistantTranscript: args.assistantTranscript,
    });
    const userMessage = input.userTranscript
      ? { role: "user" as const, content: input.userTranscript }
      : undefined;
    const assistantMessage = input.assistantTranscript
      ? { role: "assistant" as const, content: input.assistantTranscript }
      : undefined;
    const existing = await ctx.db
      .query("liveConversationTurns")
      .withIndex("by_token_identifier_and_thread_id_and_turn_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("threadId", args.threadId).eq("turnId", input.turnId),
      )
      .unique();
    if (existing) {
      return {
        saved: false,
        threadId: args.threadId,
        userMessageId: existing.userMessageId,
        assistantMessageId: existing.assistantMessageId,
      };
    }

    const allowed = await rateLimiter.limit(ctx, "liveTurns", { key: identity.tokenIdentifier });
    if (!allowed.ok) throw new Error("Chat request rate limit exceeded.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || !isTrialActive(trialWindow(user.createdAt, user.trialStartedAt, user.trialEndsAt))) {
      throw new Error("Your Spresso trial has ended. Choose a plan to continue.");
    }

    const userMessageId = userMessage
      ? (await saveMessages(ctx, components.agent, {
          threadId: args.threadId,
          userId: identity.tokenIdentifier,
          order: "next",
          messages: [userMessage],
        })).messages[0]?._id
      : undefined;
    const assistantMessageId = assistantMessage
      ? (await saveMessages(ctx, components.agent, {
          threadId: args.threadId,
          userId: identity.tokenIdentifier,
          order: "next",
          messages: [assistantMessage],
        })).messages[0]?._id
      : undefined;
    await ctx.db.insert("liveConversationTurns", {
      tokenIdentifier: identity.tokenIdentifier,
      threadId: args.threadId,
      turnId: input.turnId,
      userMessageId,
      assistantMessageId,
      createdAt: Date.now(),
    });
    return { saved: true, threadId: args.threadId, userMessageId, assistantMessageId };
  },
});

export const updateLiveTurnUserTranscript = mutation({
  args: { threadId: v.string(), turnId: v.string(), userTranscript: v.string() },
  returns: v.object({ updated: v.boolean(), threadId: v.string() }),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    const turnId = LiveTurnRequestSchema.shape.turnId.parse(args.turnId);
    const normalizedTranscript = args.userTranscript.trim();
    if (normalizedTranscript.length === 0) return { updated: false, threadId: args.threadId };
    const userTranscript = LiveTurnRequestSchema.shape.userTranscript.parse(normalizedTranscript);
    const marker = await ctx.db
      .query("liveConversationTurns")
      .withIndex("by_token_identifier_and_thread_id_and_turn_id", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier).eq("threadId", args.threadId).eq("turnId", turnId),
      )
      .unique();
    if (!marker?.userMessageId) return { updated: false, threadId: args.threadId };
    const messages = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [marker.userMessageId as never],
    });
    const userMessage = messages[0];
    const storedMessage = userMessage?.message;
    if (!userMessage || !storedMessage || storedMessage.role !== "user" || userMessage.threadId !== args.threadId) {
      return { updated: false, threadId: args.threadId };
    }
    const existingText = typeof storedMessage.content === "string"
      ? storedMessage.content
      : storedMessage.content.map((part) => part.type === "text" ? part.text : "").join(" ").trim();
    const normalizedExisting = existingText.trim();
    const sharesExistingPrefix =
      userTranscript.startsWith(normalizedExisting) &&
      (userTranscript.length === normalizedExisting.length ||
        normalizedExisting.endsWith(" ") ||
        userTranscript[normalizedExisting.length] === " ");
    if (normalizedExisting === userTranscript) return { updated: true, threadId: args.threadId };
    if (!normalizedExisting || !sharesExistingPrefix) {
      return { updated: false, threadId: args.threadId };
    }
    await ctx.runMutation(components.agent.messages.updateMessage, {
      messageId: marker.userMessageId as never,
      patch: { message: { role: "user", content: userTranscript } },
    });
    return { updated: true, threadId: args.threadId };
  },
});

export const sendMessage = mutation({
  args: { threadId: v.string(), prompt: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireFirebaseIdentity(ctx);
    await authorizeThread(ctx, args.threadId, identity.tokenIdentifier);
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || !isTrialActive(trialWindow(user.createdAt, user.trialStartedAt, user.trialEndsAt))) {
      throw new Error("Your Spresso trial has ended. Choose a plan to continue.");
    }
    const input = ChatRequestSchema.parse({ prompt: args.prompt });
    const allowed = await rateLimiter.limit(ctx, "chatMessages", { key: identity.tokenIdentifier });
    if (!allowed.ok) throw new Error("Chat request rate limit exceeded.");

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: identity.tokenIdentifier,
      prompt: input.prompt,
    });
    await ctx.scheduler.runAfter(0, internal.aiGeneration.generateResponse, {
      threadId: args.threadId,
      tokenIdentifier: identity.tokenIdentifier,
      promptMessageId: messageId,
    });
    return null;
  },
});

export const recordUsage = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    threadId: v.optional(v.string()),
    model: v.string(),
    provider: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const safe = {
      inputTokens: Math.max(0, Math.min(args.inputTokens, 1_000_000)),
      outputTokens: Math.max(0, Math.min(args.outputTokens, 1_000_000)),
      totalTokens: Math.max(0, Math.min(args.totalTokens, 2_000_000)),
    };
    await ctx.db.insert("aiUsage", {
      tokenIdentifier: args.tokenIdentifier,
      threadId: args.threadId,
      model: args.model.slice(0, 120),
      provider: args.provider.slice(0, 120),
      ...safe,
      createdAt: Date.now(),
    });
    return null;
  },
});