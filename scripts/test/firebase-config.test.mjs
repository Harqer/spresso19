import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const firebaseConfig = JSON.parse(readFileSync("firebase.json", "utf8"));
const hosting = firebaseConfig.hosting;
const functionsIndex = readFileSync("functions/src/index.ts", "utf8");
const webApiSource = readFileSync("functions/src/webapi.ts", "utf8");
const endpointContract = JSON.parse(readFileSync("contracts/production-endpoints.json", "utf8"));

test("Firebase Hosting routes API traffic through the canonical webApi function", () => {
  assert.deepEqual(
    hosting.rewrites.find((rewrite) => rewrite.source === "/api/**"),
    { source: "/api/**", function: "webApi" },
  );
});

test("the Hosting rewrite targets an exported source function", () => {
  assert.match(functionsIndex, /export\s*\{\s*webApi\s*\}\s*from\s*["']\.\/webapi["']/);
  assert.match(webApiSource, /export\s+const\s+webApi\s*=\s*onRequest\b/);
  assert.match(webApiSource, /export\s+const\s+WEB_API_ROUTES\s*=/);
});

test("the production endpoint contract documents every web API route", () => {
  const routePaths = new Set(endpointContract.routes.map((route) => route.path));
  const routeNames = [...webApiSource.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual([...routePaths].sort(), [
    "/health",
    "/user/preferences",
    "/user/sync",
    "/user/wallet/coinbase",
  ]);
  assert.equal(routeNames.length, endpointContract.routes.length);
});

test("Firebase Hosting has no cache policy for the removed inventory endpoint", () => {
  assert.equal(
    hosting.headers.some((header) => header.source === "/api/inventory"),
    false,
  );
});
