import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("discovery paths do not query an owned product inventory", () => {
  const files = [
    "composeApp/src/commonMain/kotlin/App.kt",
    "composeApp/src/commonMain/kotlin/components/features/catalog/ProductCatalogPage.kt",
    "composeApp/src/commonMain/kotlin/components/features/chat/PersonalAIShopperChatPage.kt",
    "functions/src/ai/index.ts",
    "convex/discovery.ts",
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /collection\(["']products["']\)/, file);
    assert.doesNotMatch(source, /listProducts\(/, file);
    assert.doesNotMatch(source, /defineTable\(["']products/, file);
  }
});
