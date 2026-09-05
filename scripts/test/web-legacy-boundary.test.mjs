import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";

const sourcePaths = (await readdir("src", { recursive: true }))
  .filter((path) => path.endsWith(".ts") || path.endsWith(".tsx"));
const sourceText = await Promise.all(sourcePaths.map((path) => readFile("src/" + path, "utf8")));
const apifyService = await readFile("server/apifyService.ts", "utf8");
const activeWardrobePage = await readFile("src/components/features/wardrobe/WardrobeViewPage.tsx", "utf8");

assert.equal(
  sourceText.some((text) => /from\s*["'][^"']*(?:src\/db|\.\.\/db|\.\/db)(?:\/|["'])/.test(text)),
  false,
  "React/Vite source must not import the legacy PostgreSQL adapter",
);
assert.match(
  apifyService,
  /require\("\.\.\/src\/db\/index"\)/,
  "server Apify feed is an active legacy caller",
);
assert.match(
  apifyService,
  /SELECT \* FROM \"Product\"/,
  "the active caller still reads the legacy product table",
);
await assert.rejects(
  access("src/components/features/wardrobe/WardrobePage.tsx"),
  "the unreferenced legacy wardrobe page must not remain in the active source tree",
);
await assert.rejects(
  access("src/components/NavigableListDetailPaneScaffold.tsx"),
  "the unreferenced list-detail scaffold must not remain in the active source tree",
);
assert.match(activeWardrobePage, /export const WardrobeViewPage/);

console.log("web legacy boundary contracts passed");
