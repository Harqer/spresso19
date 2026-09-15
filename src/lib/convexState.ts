import { useConvexAuth, useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ProductItem, CustomWardrobeItem } from "../types";
import type { Id } from "../../convex/_generated/dataModel";

export const CONVEX_LIST_LIMIT = 100;

export function useConvexPreferences() {
  const { isAuthenticated } = useConvexAuth();
  const preferences = useQuery(api.reactiveState.getPreferences, isAuthenticated ? {} : "skip");
  const setPreferences = useMutation(api.reactiveState.setPreferences);
  return { preferences, setPreferences };
}

export function useConvexCart() {
  const { isAuthenticated } = useConvexAuth();
  const items = useQuery(api.reactiveState.listCartItems, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const addItem = useMutation(api.reactiveState.addCartItem);
  const setQuantity = useMutation(api.reactiveState.setCartQuantity);
  const removeItem = useMutation(api.reactiveState.removeCartItem);
  return { items, addItem, setQuantity, removeItem };
}

export function useConvexCatalogState() {
  const { isAuthenticated } = useConvexAuth();
  const preferences = useQuery(api.reactiveState.getPreferences, isAuthenticated ? {} : "skip");
  const savedProducts = useQuery(api.reactiveState.listSavedProducts, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const likedProducts = useQuery(api.reactiveState.listLikedProducts, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const setPreferences = useMutation(api.reactiveState.setPreferences);
  const setSavedProduct = useMutation(api.reactiveState.setSavedProduct);
  const setLikedProduct = useMutation(api.reactiveState.setLikedProduct);
  return { isAuthenticated, preferences, savedProducts, likedProducts, setPreferences, setSavedProduct, setLikedProduct };
}

export function useConvexSavedProducts() {
  const { savedProducts, setSavedProduct } = useConvexCatalogState();
  return { savedProducts, setSavedProduct };
}

export function useConvexProfile() {
  const { isAuthenticated } = useConvexAuth();
  const profile = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const entitlement = useQuery(api.users.getEntitlement, isAuthenticated ? {} : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const deactivateAccount = useMutation(api.users.deactivateAccount);
  return { isAuthenticated, profile, entitlement, updateProfile, deactivateAccount };
}

export function useConvexOrders() {
  const { isAuthenticated } = useConvexAuth();
  const orders = useQuery(api.commerce.checkout.listOrders, isAuthenticated ? { limit: 50 } : "skip");
  const setOrderReminder = useMutation(api.commerce.checkout.setOrderReminder);
  const requestReturn = useMutation(api.commerce.checkout.requestReturn);
  const acquireCheckoutAttempt = useMutation(api.commerce.checkout.acquireCheckoutAttempt);
  const prepareCheckout = useAction(api.commerce.actions.prepareCheckout);
  const createPaymentIntent = useAction(api.commerce.actions.createPaymentIntent);
  return { isAuthenticated, orders, setOrderReminder, requestReturn, acquireCheckoutAttempt, prepareCheckout, createPaymentIntent };
}

export function useConvexPaymentMethods() {
  const { isAuthenticated } = useConvexAuth();
  const paymentMethods = useQuery(api.payments.records.listPaymentMethods, isAuthenticated ? {} : "skip");
  const attachPaymentMethod = useAction(api.payments.stripe.attachPaymentMethod);
  const detachPaymentMethod = useAction(api.payments.stripe.detachPaymentMethod);
  return { isAuthenticated, paymentMethods, attachPaymentMethod, detachPaymentMethod };
}

export function useConvexOnboarding() {
  const { isAuthenticated } = useConvexAuth();
  const storeUploadedBytes = useAction(api.media.actions.storeUploadedBytes);
  const setPreferences = useMutation(api.reactiveState.setPreferences);
  return { storeUploadedBytes, setPreferences };
}

export function useConvexTryOn() {
  const storeUploadedBytes = useAction(api.media.actions.storeUploadedBytes);
  const createReadUrl = useAction(api.media.actions.createPrivateReadUrl);
  const runTryOnJob = useAction(api.media.actions.runTryOnJob);
  const createJob = useMutation(api.mediaJobs.create);
  return { storeUploadedBytes, createReadUrl, runTryOnJob, createJob };
}

/**
 * Visual search over a captured image: the bytes are stored owner-scoped
 * through the Bunny media boundary, then the Convex vision contract runs the
 * provider over the verified asset. No Firebase callable involved.
 */
export type ConvexVisualListing = {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  merchantUrl: string;
  source: "apify";
  providerListingId?: string;
  observedPrice?: { amount: number; currency: string; evidenceUrl: string };
  videoUrl?: string;
  rating?: number;
  reviewCount?: number;
  reviewSummary?: string;
  discoveredAt: string;
};

export function useConvexVisionSearch() {
  const storeUploadedBytes = useAction(api.media.actions.storeUploadedBytes);
  const searchByImage = useAction(api.vision.searchByImage);
  return async (imageDataUrl: string): Promise<{ listings: ConvexVisualListing[] }> => {
    const base64 = imageDataUrl.split(",")[1];
    if (!base64) throw new Error("A captured image is required.");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.byteLength === 0) throw new Error("The captured image is empty.");
    const asset = await storeUploadedBytes({ bytes: bytes.buffer as ArrayBuffer, mimeType: "image/jpeg" });
    return searchByImage({ imageMediaKey: asset.mediaKey });
  };
}

/** Curated quick prompts for the AI shopper chat (Convex-owned reference data). */
export type ConvexQuickPrompt = {
  id: string;
  prompt: string;
  title: string;
  subtitle: string;
  icon: string;
};

/**
 * AI/creator reference data + campaign generation over the Convex AI
 * gateway. Unauthenticated callers get nothing ("skip"); campaign failures
 * surface the server's typed error instead of a fake success.
 */
export function useConvexAiStudio() {
  const { isAuthenticated } = useConvexAuth();
  const quickPrompts = useQuery(api.creator.listQuickPrompts, isAuthenticated ? {} : "skip");
  const creatorTemplates = useQuery(api.creator.listCreatorTemplates, isAuthenticated ? {} : "skip");
  const creatorAgents = useQuery(api.creator.listCreatorAgents, isAuthenticated ? {} : "skip");
  const generateCampaignAction = useAction(api.aiGeneration.generateCreatorCampaign);

  const generateCreatorCampaign = async (request: {
    productName: string;
    campaignGoal: string;
    targetAudience?: string;
  }) => {
    const { campaign } = await generateCampaignAction(request);
    return campaign;
  };

  return {
    quickPrompts: (quickPrompts?.prompts ?? null) as ConvexQuickPrompt[] | null,
    creatorTemplates: creatorTemplates?.templates ?? null,
    creatorAgents: creatorAgents?.agents ?? null,
    generateCreatorCampaign,
  };
}

export function useConvexWardrobe() {
  const { isAuthenticated } = useConvexAuth();
  const wardrobeItems = useQuery(api.reactiveState.listWardrobeItems, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const likedProducts = useQuery(api.reactiveState.listLikedProducts, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const outfits = useQuery(api.reactiveState.listWardrobeOutfits, isAuthenticated ? { limit: CONVEX_LIST_LIMIT } : "skip");
  const storeUploadedBytes = useAction(api.media.actions.storeUploadedBytes);
  const addWardrobeItem = useMutation(api.reactiveState.addWardrobeItem);
  const removeWardrobeItem = useMutation(api.reactiveState.removeWardrobeItem);
  const setLikedProduct = useMutation(api.reactiveState.setLikedProduct);
  const saveOutfit = useMutation(api.reactiveState.saveWardrobeOutfit);
  const removeOutfit = useMutation(api.reactiveState.removeWardrobeOutfit);
  return { wardrobeItems, likedProducts, outfits, addWardrobeItem, removeWardrobeItem, setLikedProduct, saveOutfit, removeOutfit, storeUploadedBytes };
}

export function toConvexListing(product: ProductItem) {
  if (!product.listing) throw new Error("A verified merchant listing is required.");
  return product.listing;
}

export function toConvexWardrobeItem(item: CustomWardrobeItem) {
  if (item.type !== "user_upload" && item.type !== "bookmarked_product") {
    throw new Error("Wardrobe item type is invalid.");
  }
  return {
    clientId: item.id,
    kind: item.type,
    name: item.name,
    category: item.category,
    weatherSuitability: item.weatherSuitability,
    image: item.image,
    ...(item.brand === undefined ? {} : { brand: item.brand }),
    ...(item.price === undefined ? {} : { price: item.price }),
    ...(item.productId === undefined ? {} : { productId: item.productId }),
    addedAt: item.addedAt,
    ...(item.color === undefined ? {} : { color: item.color }),
    ...(item.mediaAssetId === undefined ? {} : { mediaAssetId: item.mediaAssetId as Id<"mediaAssets"> }),
    ...(item.mediaKey === undefined ? {} : { mediaKey: item.mediaKey }),
  } as const;
}
