import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("AI add-to-cart tool delegates to the canonical listing snapshot boundary", async () => {
  const source = await readFile(path.join(process.cwd(), "src/ai/tools/addToCart.ts"), "utf8");

  assert.match(source, /from "\.\.\/\.\.\/cart\/addListingToCart"/);
  assert.match(source, /DiscoveredListingSchema/);
  assert.match(source, /idempotencyKey/);
  assert.doesNotMatch(source, /getFirestore/);
  assert.doesNotMatch(source, /collection\("carts"\)/);
  assert.doesNotMatch(source, /productId: z\.string\(\)/);
});
