import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discovery paths do not query an owned product inventory", () => {
  const files = [
    "src/App.tsx",
    "src/components/features/catalog/ProductCatalogPage.tsx",
    "src/components/features/chat/PersonalAIShopperChatPage.tsx",
    "functions/src/webapi.ts",
    "functions/src/ai/index.ts",
    "functions/src/missingRoutes.ts"
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /collection\(["']products["']\)/, file);
    assert.doesNotMatch(source, /listProducts\(/, file);
  }
});
