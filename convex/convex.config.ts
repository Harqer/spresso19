import { defineApp } from "convex/server";
import { v } from "convex/values";
import agent from "@convex-dev/agent/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp({
  env: {
    BUNNY_STORAGE_HOST: v.optional(v.string()),
    BUNNY_STORAGE_ZONE: v.optional(v.string()),
    BUNNY_STORAGE_ACCESS_KEY: v.optional(v.string()),
    BUNNY_CDN_BASE_URL: v.optional(v.string()),
    BUNNY_CDN_TOKEN_KEY: v.optional(v.string()),
    BUNNY_SOURCE_HOSTS: v.optional(v.string()),
    SPRESSO_LLM_MODEL: v.optional(v.string()),
    PARALLEL_API_KEY: v.optional(v.string()),
    SERPAPI_API_KEY: v.optional(v.string()),
    CLOUDFLARE_ACCOUNT_ID: v.optional(v.string()),
    CLOUDFLARE_API_TOKEN: v.optional(v.string()),
  },
});
app.use(agent);
app.use(rateLimiter);

export default app;
