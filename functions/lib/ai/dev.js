"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Genkit Developer UI entrypoint. Import every flow so the CLI can discover
// the same shopper, commerce, media, cooking, and product flows used by Firebase.
require("./genkit");
require("./tools/addToCart");
require("./tools/searchProducts");
require("./tools/chefAgent");
require("./tools/ecommerceAgent");
require("./tools/virtualTryOnAgent");
require("./tools/mediaGeneration");
require("./tools/parallelWebSearch");
require("./tools/parallelDeepResearch");
require("./tools/marketResearchUKAgent");
require("./tools/marketResearchUSAgent");
require("./tools/kitesurfSearch");
require("./flows/shopperFlow");
require("./flows/virtualTryOnFlow");
require("./flows/spin360Flow");
require("./flows/discoverPersonalizedProductsFlow");
require("./flows/behavioralAnalysisFlow");
console.log("Genkit flows and tools loaded.");
//# sourceMappingURL=dev.js.map