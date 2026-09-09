import React, { useState, useEffect, useMemo, useRef } from "react";
import { ProductItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { GenkitCreativeStudioModal } from "../../GenkitCreativeStudioModal";
import { AIShopperInputBar } from "../../AIShopperInputBar";
import { ProductCatalogGrid } from "@/src/components/features/catalog/ProductCatalogGrid";
import { ProblemDetailsCard } from "@/src/components/shared/ProblemDetailsCard";
import { AICurationFeed } from "@/src/components/features/catalog/AICurationFeed";
import { ProductCatalogHeader } from "@/src/components/features/catalog/ProductCatalogHeader";
import { DiscoveryRepository } from "../../../lib/discoveryRepository";
import Logger from "../../../lib/Logger";

export const ProductCatalogPage: React.FC<any> = ({ onSelectTryOn, onRequestMerchantCheckout, onAddToCart, userLocation, searchRadius = 25, onRadiusChange, onRequestLocationPermission, onAskAI, onOpenLens, discoveryRepository, onListingsChanged }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [personalizedProducts, setPersonalizedProducts] = useState<ProductItem[]>([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState<boolean>(false);
  const [genkitModalProduct, setGenkitModalProduct] = useState<ProductItem | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const fetchPersonalizedFeed = async (cat: string) => {
    const generation = ++requestGeneration.current;
    setIsLoadingPersonalized(true);
    setFetchError(null);
    try {
      const query = cat === "ALL" ? "current products matching my preferences" : `${cat} products`;
      const listings = await (discoveryRepository as DiscoveryRepository).search({ query, location: userLocation, radius: searchRadius });
      if (generation !== requestGeneration.current) return;
      const items = (discoveryRepository as DiscoveryRepository).asProducts(listings);
      setPersonalizedProducts(items);
      onListingsChanged?.();
    } catch (err: any) {
      if (generation !== requestGeneration.current) return;
      setFetchError("Unable to load product catalog. Please try again later.");
      setPersonalizedProducts([]);
    } finally {
      if (generation === requestGeneration.current) setIsLoadingPersonalized(false);
    }
  };
  // Discovery is intentionally user initiated. Filter and location changes only
  // update the pending request; the provider is called from an explicit action.
  const applyCatalogFilters = (category: string = selectedCategory) => {
    setSelectedCategory(category);
    void fetchPersonalizedFeed(category);
  };
  const [userPreferences, setUserPreferences] = useState<{
    bookmarkedIds: string[],
    likedIds: string[],
    searchInquiries: string[]
  }>({ bookmarkedIds: [], likedIds: [], searchInquiries: [] });
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const { httpsCallable } = await import("firebase/functions");
        const { functions } = await import("../../../lib/firebase");
        const getUserPreferences = httpsCallable(functions, "getUserPreferences");
        const res = await getUserPreferences();
        const data = res.data as any;
        setUserPreferences({
          bookmarkedIds: data.bookmarkedIds || [],
          likedIds: data.likedIds || [],
          searchInquiries: data.searchInquiries || []
        });
      } catch (err) {
        Logger.warn("Failed to fetch user preferences:", err);
      }
    };
    fetchPrefs();
  }, []);
  const curatedPersonalizedProducts = useMemo(() => {
    const { bookmarkedIds, likedIds, searchInquiries } = userPreferences;
    const scored = personalizedProducts.map(p => {
      let score = 0;
      if (bookmarkedIds.includes(p.id)) {
        score += 100;
      }
      if (likedIds.includes(p.id)) {
        score += 80;
      }
      const pText = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      searchInquiries.forEach(query => {
        const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        terms.forEach(term => {
          if (pText.includes(term)) {
            score += 50;
          }
        });
      });
      const interestingCategories = personalizedProducts
        .filter(ip => bookmarkedIds.includes(ip.id) || likedIds.includes(ip.id))
        .map(ip => ip.category.toLowerCase());
      if (interestingCategories.includes(p.category.toLowerCase())) {
        score += 30;
      }
      return { product: p, score };
    });
    const personalizedOnly = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.product);
    if (personalizedOnly.length > 0) {
      return personalizedOnly.slice(0, 3);
    } else {
      return personalizedProducts.slice(0, 3);
    }
  }, [personalizedProducts, userPreferences]);
  return (
    <div className="space-y-6">
      <ProductCatalogHeader
        userLocation={userLocation}
        searchRadius={searchRadius}
        totalItems={personalizedProducts.length}
        selectedCategory={selectedCategory}
        onRequestLocationPermission={onRequestLocationPermission}
        onSelectCategory={applyCatalogFilters}
      />
      {selectedCategory === "ALL" && curatedPersonalizedProducts.length > 0 && (
        <AICurationFeed curatedPersonalizedProducts={curatedPersonalizedProducts} onSelectTryOn={onSelectTryOn} />
      )}
      {fetchError && (
        <ProblemDetailsCard
          error={{
            title: "Connection Warning",
            status: 503,
            detail: fetchError
          }}
          onRetry={() => fetchPersonalizedFeed(selectedCategory)}
          className="mb-4"
        />
      )}
      <ProductCatalogGrid products={personalizedProducts} isLoading={isLoadingPersonalized} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} onRequestMerchantCheckout={onRequestMerchantCheckout} onOpenLens={onOpenLens} setGenkitModalProduct={setGenkitModalProduct} fetchFeed={() => fetchPersonalizedFeed(selectedCategory)} />
      {genkitModalProduct && <GenkitCreativeStudioModal product={genkitModalProduct} onClose={() => setGenkitModalProduct(null)} />}
      <AIShopperInputBar onSend={(t, img) => onAskAI?.(t, img)} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} placeholder="Ask Spresso AI about products..." className="mt-6" />
    </div>
  );
};
