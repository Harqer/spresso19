// Genkit Developer UI entrypoint. Import every flow so the CLI can discover
// the same shopper, commerce, media, cooking, and product flows used by Firebase.
import "./genkit";
import "./tools/addToCart";
import "./tools/searchProducts";
import "./tools/chefAgent";
import "./tools/ecommerceAgent";
import "./tools/virtualTryOnAgent";
import "./tools/mediaGeneration";
import "./tools/parallelWebSearch";
import "./tools/parallelDeepResearch";
import "./tools/marketResearchUKAgent";
import "./tools/marketResearchUSAgent";
import "./tools/kitesurfSearch";
import "./flows/shopperFlow";
import "./flows/virtualTryOnFlow";
import "./flows/spin360Flow";
import "./flows/discoverPersonalizedProductsFlow";
import "./flows/behavioralAnalysisFlow";

console.log("Genkit flows and tools loaded.");
