import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Production-hardcoding boundary for the TypeScript surfaces that ship:
// convex/ (owned backend) and functions/src (Genkit/media gateway).
// The React-era web client this test originally guarded has been removed;
// Kotlin/Compose surfaces are covered by the Android lint + Detekt gates.

const root = resolve(import.meta.dirname, "../..");
const violations = [];

const forbiddenCustomerClaims = [
  /SPRESSO10/i,
  /VIP UNLOCKED/i,
  /Virtual Try-On Verified/i,
  /Payment Method Saved/i,
  /Photo Gallery Linked/i,
  /Pipeline Verified/i,
  /Reserved from personal closet/i,
  /Click confirm to place order/i,
  /Free Express/i,
  /Biometric Agentic Authorization/i,
  /Processing Settlement Order/i,
];

// The Convex backend must route models through the Convex Agent Gateway
// (convex/ai/model.ts), never import a vendor SDK directly. @google/genai is
// a Functions media-gateway exception only.
const forbiddenImports = [
  { pattern: /from\s+["']@google\/genai["']/, only: "functions/src", label: "direct Gemini SDK import outside the Functions media gateway" },
  { pattern: /from\s+["']google-genai["']/, only: "functions/src", label: "direct Gemini SDK import outside the Functions media gateway" },
];

const scanDirs = ["convex", "functions/src"];
const excludeDirs = new Set(["node_modules", "_generated", "lib", "test"]);
const tsFiles = [];

function collectTsFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (!excludeDirs.has(entry)) collectTsFiles(absolute);
    } else if (/\.tsx?$/.test(entry)) {
      tsFiles.push(absolute);
    }
  }
}

for (const dir of scanDirs) collectTsFiles(resolve(root, dir));

for (const absolutePath of tsFiles) {
  const file = relative(root, absolutePath);
  const source = readFileSync(absolutePath, "utf8");
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    const location = `${file}:${index + 1}`;
    if (/VITE_[A-Z0-9_]+/.test(line)) {
      violations.push(`${location} browser env reference`);
    }
    for (const claim of forbiddenCustomerClaims) {
      if (claim.test(line)) {
        violations.push(`${location} synthetic customer claim: ${claim.source}`);
      }
    }
    for (const rule of forbiddenImports) {
      if (rule.pattern.test(line) && !file.replaceAll("\\", "/").startsWith(rule.only)) {
        violations.push(`${location} ${rule.label}`);
      }
    }
  });
}

assert.deepEqual(
  violations,
  [],
  `production hardcoding boundary violations:\n${violations.join("\n")}`,
);
console.log("production hardcoding boundary passed");
