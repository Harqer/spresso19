import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const root = path.join(repoRoot, "functions/src");
const manifest = JSON.parse(await fs.readFile(path.join(repoRoot, "contracts/firebase-functions.json"), "utf8"));
const files = [];
async function walk(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith(".ts")) files.push(file);
  }
}
await walk(root);
const source = (await Promise.all(files.map((file) => fs.readFile(file, "utf8")))).join("\n");
const exports = new Set([...source.matchAll(/export\s+const\s+([A-Za-z0-9_]+)/g)].map((match) => match[1]));
const missing = manifest.clientCallableNames.filter((name) => !exports.has(name));
if (missing.length) {
  console.error(`Missing Firebase callable exports: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${manifest.clientCallableNames.length} Firebase callable exports.`);
}
