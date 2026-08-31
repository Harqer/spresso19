import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = join(projectRoot, "dist");
const manifestPath = join(distRoot, ".vite", "manifest.json");

assert.ok(existsSync(manifestPath), "run `npm run build -- --manifest` before the bundle budget test");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const jsAssets = readdirSync(join(distRoot, "assets"))
  .filter((name) => name.endsWith(".js"))
  .map((name) => ({ name, bytes: statSync(join(distRoot, "assets", name)).size }));
const entry = Object.values(manifest).find((item) => item.isEntry && item.src === "index.html");

assert.ok(entry, "manifest must contain the index.html entry");
const initialBytes = entry.file.endsWith(".js")
  ? statSync(join(distRoot, entry.file)).size
  : jsAssets.find(({ name }) => name === entry.file)?.bytes;
assert.ok(Number.isInteger(initialBytes), "main entry JavaScript asset must exist");
assert.ok(initialBytes <= 1_100_000, `initial JavaScript bundle is ${initialBytes} bytes, over 1100000 byte budget`);

const routeNames = ["CatalogRoute", "ChatRoute", "CreatorRoute", "TravelRoute", "VisionRoute", "WardrobeRoute"];
for (const routeName of routeNames) {
  const routeEntry = Object.entries(manifest).find(([key, item]) => key.endsWith(`src/routes/${routeName}.tsx`));
  assert.ok(routeEntry, `manifest must contain a ${routeName} route entry`);
  assert.ok(routeEntry[1].file.endsWith(".js"), `${routeName} must compile to a JavaScript chunk`);
}

const initialAsset = readFileSync(join(distRoot, entry.file), "utf8");
for (const productionOnlyModule of ["ProductCatalogPage", "PersonalAIShopperChatPage", "TravelTripsPage", "SmartVisionView", "WardrobeViewPage"]) {
  assert.equal(initialAsset.includes(productionOnlyModule), false, `${productionOnlyModule} leaked into the initial chunk`);
}

console.log(`bundle budget passed: initial JavaScript ${initialBytes} bytes, ${routeNames.length} route chunks`);
