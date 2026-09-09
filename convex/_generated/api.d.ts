/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_guardrails from "../ai/guardrails.js";
import type * as aiChat from "../aiChat.js";
import type * as aiGeneration from "../aiGeneration.js";
import type * as commerce_checkout from "../commerce/checkout.js";
import type * as lib_identity from "../lib/identity.js";
import type * as media from "../media.js";
import type * as media_actions from "../media/actions.js";
import type * as media_boundary from "../media/boundary.js";
import type * as media_bunnyStore from "../media/bunnyStore.js";
import type * as reactiveState from "../reactiveState.js";
import type * as trial from "../trial.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/guardrails": typeof ai_guardrails;
  aiChat: typeof aiChat;
  aiGeneration: typeof aiGeneration;
  "commerce/checkout": typeof commerce_checkout;
  "lib/identity": typeof lib_identity;
  media: typeof media;
  "media/actions": typeof media_actions;
  "media/boundary": typeof media_boundary;
  "media/bunnyStore": typeof media_bunnyStore;
  reactiveState: typeof reactiveState;
  trial: typeof trial;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
