import assert from "node:assert/strict";
import fs from "node:fs";

const schema = JSON.parse(fs.readFileSync("contracts/discovered-listing.schema.json", "utf8"));
assert.deepEqual(schema.required, ["id", "name", "merchantUrl", "source", "discoveredAt"]);
assert.deepEqual(schema.properties.source.enum, ["parallel", "serpapi", "apify", "kitesurf"]);
assert.equal(schema.properties.merchantUrl.pattern, "^https://");
assert.equal(schema.properties.observedPrice.properties.amount.exclusiveMinimum, 0);
assert.equal(schema.properties.observedPrice.properties.currency.pattern, "^[A-Z]{3}$");
console.log("discovered-listing contract tests passed");
