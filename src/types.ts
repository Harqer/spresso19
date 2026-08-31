import type { CartListingSnapshot, DiscoveredListing } from "./lib/discoveredListing";

export interface CartItem {
  product: ProductItem;
  listing: CartListingSnapshot;
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
  /** Merchant/listing availability is verified only at checkout. */
  availabilityStatus?: "UNKNOWN" | "VERIFY_AT_MERCHANT_CHECKOUT" | "AVAILABLE" | "UNAVAILABLE";
  merchantUrl?: string;
  sku: string;
  rating: number;
  description: string;
  image: string;
  virtualTryOnEligible: boolean;
  mcpServerId: string;
  matchScore?: number;
  listing?: DiscoveredListing;
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
  availabilityStatus: "UNKNOWN" | "VERIFY_AT_MERCHANT_CHECKOUT" | "AVAILABLE" | "UNAVAILABLE";
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

export const WARDROBE_CATEGORIES_DEFAULT = ["TOP", "BOTTOM", "SWEATER_OUTERWEAR", "SHOES", "ACCESSORY", "DRESS"] as const;
export type WardrobeCategory = string;
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

export interface TripRecord {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED";
  coverImage: string;
  budgetTotal?: number;
  spentTotal?: number;
}

export interface ItineraryEvent {
  id: string;
  tripId: string;
  type: "flight" | "hotel" | "restaurant" | "tour" | "ticket";
  title: string;
  description: string;
  eventTime: string;
  location: string;
  price?: number;
  qrData?: string;
  confirmationCode?: string;
  gate?: string;
  seat?: string;
}

export interface TravelExpense {
  id: string;
  tripId: string;
  amount: number;
  currency: string;
  category: "Dining" | "Flight" | "Hotel" | "Shopping" | "Transport" | "Activities";
  merchant: string;
  date: string;
  receiptImageUrl?: string;
  items?: Array<{ name: string; price: number }>;
}

export interface VoiceNote {
  id: string;
  tripId: string;
  transcript: string;
  audioUrl?: string;
  createdAt: string;
}
