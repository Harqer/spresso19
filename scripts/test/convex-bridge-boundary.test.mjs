import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const bridge = readFileSync("convex/lib/bridge.ts", "utf8");
const http = readFileSync("convex/http.ts", "utf8");
const listing = readFileSync("convex/lib/listing.ts", "utf8");

test("Convex HTTP bridge avoids untyped any casts", () => {
  assert.doesNotMatch(http, /\bas any\b/, "convex/http.ts must not use `as any`");
});

test("Convex HTTP bridge delegates typed ID parsing to bridge helpers", () => {
  assert.match(http, /requireConvexId</);
  assert.match(http, /requireListingSnapshot/);
  assert.match(http, /requireExpenseCategory/);
  assert.match(bridge, /export function requireConvexId/);
  assert.match(bridge, /export function requireListingSnapshot/);
  assert.match(bridge, /export function requireExpenseCategory/);
});

test("listing snapshots have an explicit bridge-facing type", () => {
  assert.match(listing, /export type ListingSnapshot/);
  assert.match(listing, /export const listingValidator/);
});
