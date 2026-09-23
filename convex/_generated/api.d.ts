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
import type * as ai_liveToken from "../ai/liveToken.js";
import type * as ai_model from "../ai/model.js";
import type * as ai_research from "../ai/research.js";
import type * as ai_tools from "../ai/tools.js";
import type * as ai_visionProvider from "../ai/visionProvider.js";
import type * as aiChat from "../aiChat.js";
import type * as aiGeneration from "../aiGeneration.js";
import type * as commerce_actions from "../commerce/actions.js";
import type * as commerce_checkout from "../commerce/checkout.js";
import type * as creator from "../creator.js";
import type * as discovery from "../discovery.js";
import type * as discoveryState from "../discoveryState.js";
import type * as grocery from "../grocery.js";
import type * as http from "../http.js";
import type * as lib_bridge from "../lib/bridge.js";
import type * as lib_browserHttp from "../lib/browserHttp.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_listing from "../lib/listing.js";
import type * as media from "../media.js";
import type * as media_actions from "../media/actions.js";
import type * as media_boundary from "../media/boundary.js";
import type * as media_bunnyStore from "../media/bunnyStore.js";
import type * as mediaJobs from "../mediaJobs.js";
import type * as merchantBrowser_events from "../merchantBrowser/events.js";
import type * as merchantBrowser_index from "../merchantBrowser/index.js";
import type * as merchantBrowser_provider from "../merchantBrowser/provider.js";
import type * as merchantBrowser_state from "../merchantBrowser/state.js";
import type * as merchantBrowser_tools from "../merchantBrowser/tools.js";
import type * as payments_records from "../payments/records.js";
import type * as payments_stripe from "../payments/stripe.js";
import type * as rateLimits from "../rateLimits.js";
import type * as reactiveState from "../reactiveState.js";
import type * as recommendationQueries from "../recommendationQueries.js";
import type * as telemetry from "../telemetry.js";
import type * as travel from "../travel.js";
import type * as trial from "../trial.js";
import type * as users from "../users.js";
import type * as vision from "../vision.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/guardrails": typeof ai_guardrails;
  "ai/liveToken": typeof ai_liveToken;
  "ai/model": typeof ai_model;
  "ai/research": typeof ai_research;
  "ai/tools": typeof ai_tools;
  "ai/visionProvider": typeof ai_visionProvider;
  aiChat: typeof aiChat;
  aiGeneration: typeof aiGeneration;
  "commerce/actions": typeof commerce_actions;
  "commerce/checkout": typeof commerce_checkout;
  creator: typeof creator;
  discovery: typeof discovery;
  discoveryState: typeof discoveryState;
  grocery: typeof grocery;
  http: typeof http;
  "lib/bridge": typeof lib_bridge;
  "lib/browserHttp": typeof lib_browserHttp;
  "lib/identity": typeof lib_identity;
  "lib/listing": typeof lib_listing;
  media: typeof media;
  "media/actions": typeof media_actions;
  "media/boundary": typeof media_boundary;
  "media/bunnyStore": typeof media_bunnyStore;
  mediaJobs: typeof mediaJobs;
  "merchantBrowser/events": typeof merchantBrowser_events;
  "merchantBrowser/index": typeof merchantBrowser_index;
  "merchantBrowser/provider": typeof merchantBrowser_provider;
  "merchantBrowser/state": typeof merchantBrowser_state;
  "merchantBrowser/tools": typeof merchantBrowser_tools;
  "payments/records": typeof payments_records;
  "payments/stripe": typeof payments_stripe;
  rateLimits: typeof rateLimits;
  reactiveState: typeof reactiveState;
  recommendationQueries: typeof recommendationQueries;
  telemetry: typeof telemetry;
  travel: typeof travel;
  trial: typeof trial;
  users: typeof users;
  vision: typeof vision;
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
