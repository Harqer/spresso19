import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const protectedFunctions = [
  ["src/users.ts", ["initializeOnboarding", "connectCoinbaseWallet", "getUserProfile"]],
  ["src/interactions.ts", ["ingestInteraction"]],
  ["src/catalog.ts", ["getTravelTrips"]],
  ["src/wardrobe/index.ts", ["curateWardrobe", "getUserLikes", "getUserBookmarks", "toggleUserLike", "toggleUserBookmark", "getUserPreferences", "updateUserPreferences"]],
];

test("user-scoped callables enforce App Check", async () => {
  const errors: string[] = [];
  for (const [relative, names] of protectedFunctions) {
    const source = await readFile(path.join(process.cwd(), relative), "utf8");
    for (const name of names as string[]) {
      const declaration = source.match(new RegExp(`export const ${name}\\s*=\\s*onCall\\(([^)]|\\n)*?\\)`));
      assert.ok(declaration, `${name} must remain an exported callable`);
      if (!declaration?.[0].includes("enforceAppCheck: true")) errors.push(name);
    }
  }
  assert.deepEqual(errors, [], `Missing enforceAppCheck: ${errors.join(", ")}`);
});
