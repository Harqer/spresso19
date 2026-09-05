import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const firebaseConfig = JSON.parse(readFileSync("firebase.json", "utf8"));
const hosting = firebaseConfig.hosting;

test("Firebase Hosting routes API traffic through the canonical webApi function", () => {
  assert.deepEqual(
    hosting.rewrites.find((rewrite) => rewrite.source === "/api/**"),
    { source: "/api/**", function: "webApi" },
  );
});

test("Firebase Hosting has no cache policy for the removed inventory endpoint", () => {
  assert.equal(
    hosting.headers.some((header) => header.source === "/api/inventory"),
    false,
  );
});
