import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const firebaseConfig = JSON.parse(readFileSync("firebase.json", "utf8"));
const hosting = firebaseConfig.hosting;
const functionsIndex = readFileSync("functions/src/index.ts", "utf8");
const gatewayIndex = readFileSync("functions/src/ai/index.ts", "utf8");

test("Firebase Hosting serves the KMP wasm build with a catch-all SPA rewrite", () => {
  assert.deepEqual(
    hosting.rewrites.find((rewrite) => rewrite.source === "**"),
    { source: "**", destination: "/index.html" },
  );
});

test("no hosting rewrite routes API traffic to a Functions webApi plane", () => {
  assert.equal(
    hosting.rewrites.some((rewrite) => rewrite.source === "/api/**"),
    false,
  );
});

test("the Functions entrypoint re-exports the AI gateway", () => {
  assert.match(functionsIndex, /export\s+\*\s+from\s+["']\.\/ai["']/);
});

test("the gateway keeps the streaming shopper endpoint and app-check enforcement", () => {
  assert.match(gatewayIndex, /export\s+const\s+chatStream\s*=\s*onRequest\b/);
  assert.match(gatewayIndex, /enforceAppCheck:\s*true/);
  assert.match(gatewayIndex, /export\s+const\s+generateVirtualTryOn\s*=/);
});
