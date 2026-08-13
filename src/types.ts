export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export type DeviceMode = "META_SMART_GLASSES" | "MOBILE_IOS" | "MOBILE_ANDROID" | "WEB";

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  sku: string;
  rating: number;
  description: string;
  image: string;
  virtualTryOnEligible: boolean;
  mcpServerId: string;
  matchScore?: number;
  personalizationReason?: string;
  genMediaKit?: {
    videoUrl?: string;
    angles?: string[];
    materials?: string[];
    sustainabilityScore?: string;
    priceComparison?: Array<{ merchant: string; price: number; inStock: boolean; shipping: string }>;
  };
}

export interface DetectedItem {
  detectedName: string;
  brandGuess: string;
  category: string;
  priceEstimate: number;
  confidenceScore: number;
  boundingBox: [number, number, number, number]; // ymin, xmin, ymax, xmax
  matchingCatalogId?: string;
  buyActionPrompt: string;
}

export interface OrderRecord {
  id: string;
  items: Array<{ product: ProductItem; quantity: number }>;
  totalAmount: number;
  status: "AUTHORIZED" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "RETURN_REQUESTED" | "RETURNED" | "CANCELLED";
  deviceSource: DeviceMode;
  humanConfirmedAt: string;
  mcpTransactionHash: string;
  shippingAddress: string;
  trackingStatus?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  returnStatus?: "NONE" | "REQUESTED" | "APPROVED" | "COMPLETED";
  returnReason?: string;
  reminderSet?: boolean;
  reminderTime?: string;
  paymentMethod?: string;
  userUid?: string;
}

export interface HITLPayload {
  authorizationId: string;
  product: {
    id: string;
    name: string;
    price: number;
    sku: string;
    image: string;
  };
  quantity: number;
  totalAmount: number;
  currency: string;
  deviceSource: DeviceMode;
  inventoryConfirmed: boolean;
  stockRemaining: number;
  humanInTheLoopChallenge: {
    title: string;
    message: string;
    safetyChecks: string[];
  };
}

export interface EconomicResearchResult {
  plannerExecutionGraph: Array<{
    step: number;
    agent: string;
    status: string;
    note: string;
  }>;
  economicMetrics: {
    gdpGrowthRate: string;
    inflationIndexCPI: string;
    creatorEconomyCAGR: string;
    smartWearablesDemandScore: string;
  };
  executiveNarrative: string;
  strategicRecommendations: string[];
}

export interface CreatorCampaignResult {
  brandIdentity: {
    subdomain: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    logoConcept: string;
  };
  genMediaLoopExecution: Array<{
    agent: string;
    action: string;
    score?: number;
    status?: string;
  }>;
  marketingCampaign: {
    campaignTitle: string;
    socialCopy: string;
    emailSubject: string;
    suggestedAds: Array<{ platform: string; hook: string }>;
  };
  generatedStorefrontConfig: {
    heroHeading: string;
    featuredProducts: string[];
  };
}

export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

export type WardrobeCategory = "TOP" | "BOTTOM" | "SWEATER_OUTERWEAR" | "SHOES" | "ACCESSORY" | "DRESS";
export type WeatherSuitability = "SUMMER_HEAT" | "MILD_SPRING_AUTUMN" | "WINTER_COLD" | "ALL_WEATHER" | "HOT_SUMMER" | "COLD_WINTER";

export interface CustomWardrobeItem {
  id: string;
  type?: string;
  name: string;
  category: WardrobeCategory;
  weatherSuitability: WeatherSuitability;
  image: string;
  brand?: string;
  price?: number;
  productId?: string;
  addedAt: number;
  color?: string;
}

export interface GeneratedOutfit {
  id: string;
  title: string;
  weatherCondition: WeatherSuitability;
  temperatureText: string;
  items: CustomWardrobeItem[];
  stylingAdvice: string;
  weatherMatchScore: number;
  savedAt?: number;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  isStreaming?: boolean;
  products?: ProductItem[];
  locationData?: any;
  audioUrl?: string;
  thought?: string;
  sources?: any[];
}


