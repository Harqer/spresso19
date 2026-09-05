import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProductIds } from "../src/catalog";

test("normalizes product IDs for bounded discovery lookup", () => {
  assert.deepEqual(normalizeProductIds(["a", " a ", "", 42, "b"], 2), ["a", "b"]);
});

test("rejects an unbounded product lookup", () => {
  assert.throws(() => normalizeProductIds(Array.from({ length: 51 }, (_, i) => String(i)), 50), /too many/i);
});
