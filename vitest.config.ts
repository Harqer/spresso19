import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    // Convex component tests share an in-memory component registry. Running
    // them in parallel creates CPU/memory contention and causes legitimate
    // identity/trial tests to exceed Vitest's default five-second timeout.
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20_000,
  },
});
