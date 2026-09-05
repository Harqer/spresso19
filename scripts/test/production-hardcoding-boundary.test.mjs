import assert from "node:assert/strict";
import { relative, resolve } from "node:path";
import { API } from "typescript/unstable/sync";
import * as ts from "typescript/unstable/ast";

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

function checkNode(node, sourceFile, file) {
  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@google/genai") {
    violations.push(`${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1} browser Gemini SDK import`);
  }
  if (ts.isStringLiteralLikeNode(node) || ts.isJsxText(node)) {
    const value = node.text;
    if (/VITE_GEMINI_API_KEY/.test(value)) {
      violations.push(`${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1} browser Gemini key`);
    }
    for (const claim of forbiddenCustomerClaims) {
      if (claim.test(value)) {
        violations.push(`${file}:${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1} synthetic customer claim: ${claim.source}`);
      }
    }
  }
  node.forEachChild((child) => checkNode(child, sourceFile, file));
}

const api = new API();
const configPath = resolve(root, "tsconfig.json");
const snapshot = api.updateSnapshot({ openProjects: [configPath] });
try {
  const project = snapshot.getProject(configPath);
  assert.ok(project, "TypeScript project must load");
  for (const absolutePath of project.program.getSourceFileNames()) {
    const file = relative(root, absolutePath);
    if (!file.startsWith("src/") || !/\.(?:ts|tsx)$/.test(file) || /\.test\.(?:ts|tsx)$/.test(file)) continue;
    const sourceFile = project.program.getSourceFile(absolutePath);
    if (sourceFile) checkNode(sourceFile, sourceFile, file);
  }
} finally {
  snapshot.dispose();
  api.close();
}

assert.deepEqual(violations, [], `production hardcoding boundary violations:\n${violations.join("\n")}`);
console.log("production hardcoding boundary passed");
