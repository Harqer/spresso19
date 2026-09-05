const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const rulesSource = fs.readFileSync(path.join(__dirname, "..", "..", "firestore.rules"), "utf8");

function blockFor(rule) {
  const start = rulesSource.indexOf(rule);
  assert.ok(start >= 0, `Expected rules block: ${rule}`);
  let brace = -1;
  for (let i = start; i < rulesSource.length; i += 1) {
    if (rulesSource[i] === "{" && /\s/.test(rulesSource[i - 1])) {
      brace = i;
      break;
    }
  }
  assert.ok(brace >= 0, `No block opening found for: ${rule}`);
  let depth = 0;
  let i = brace;
  for (; i < rulesSource.length; i += 1) {
    if (rulesSource[i] === "{") depth += 1;
    if (rulesSource[i] === "}") {
      depth -= 1;
      if (depth === 0) return rulesSource.slice(brace, i + 1);
    }
  }
  throw new Error(`Unbalanced rules block: ${rule}`);
}

test("orders live nested under /users/{userId}/orders", () => {
  const block = blockFor("match /users/{userId}/orders/{orderId}");
  assert.match(block, /allow read: if isOwner\(userId\)/);
  assert.match(block, /allow update: if false/);
  assert.match(block, /allow create: if isOwner\(userId\)/);
});

test("top-level orders collection grants no direct client access", () => {
  const topLevel = rulesSource.match(/match \/orders(\/\{[^}]+\})? \{[^}]*\}/s);
  const readable = topLevel && /allow read: if (?!false)/.test(topLevel[0]);
  assert.equal(Boolean(readable), false);
  assert.doesNotMatch(rulesSource, /match \/orders[^\n]*\{\s*allow read, write: if true/s);
});

test("default deny catch-all covers unmatched collections", () => {
  const catchAll = blockFor("match /{document=**}");
  assert.match(catchAll, /allow read, write: if false/);
});

test("wallet transfer records grant no direct client access", () => {
  // Server-only collection: the catch-all must be the only governing rule.
  assert.doesNotMatch(rulesSource, /match \/walletTransfers[^\n]*\{[\s\S]*?allow (read|write|create|update)/);
  const catchAll = blockFor("match /{document=**}");
  assert.match(catchAll, /allow read, write: if false/);
});