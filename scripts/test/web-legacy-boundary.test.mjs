import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";

const sourcePaths = (await readdir("src", { recursive: true }))
  .filter((path) => path.endsWith(".ts") || path.endsWith(".tsx"));
const sourceText = await Promise.all(sourcePaths.map((path) => readFile("src/" + path, "utf8")));
const activeWardrobePage = await readFile(
  "composeApp/src/commonMain/kotlin/components/features/wardrobe/WardrobeViewPage.kt",
  "utf8",
);

assert.equal(
  sourceText.some((text) => /from\s*["'][^"']*(?:src\/db|\.\.\/db|\.\/db)(?:\/|["'])/.test(text)),
  false,
  "Web source must not import a legacy PostgreSQL adapter",
);
await assert.rejects(
  access("src/db"),
  "the legacy PostgreSQL adapter must not return under src/",
);
await assert.rejects(
  access("src/components/features/wardrobe/WardrobePage.tsx"),
  "the unreferenced legacy React wardrobe page must not remain in the active source tree",
);
await assert.rejects(
  access("src/components/NavigableListDetailPaneScaffold.tsx"),
  "the unreferenced list-detail scaffold must not remain in the active source tree",
);
await assert.rejects(
  access("src/components"),
  "the legacy React components tree must not return under src/",
);
assert.match(activeWardrobePage, /fun WardrobeViewPage/);

console.log("web legacy boundary contracts passed");
