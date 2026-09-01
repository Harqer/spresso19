import Logger from "../../../lib/Logger";
import React, { useState, useEffect, useMemo } from "react";
import { ProductItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { GenkitCreativeStudioModal } from "../../GenkitCreativeStudioModal";
import { AIShopperInputBar } from "../../AIShopperInputBar";
import { ProductCatalogGrid } from "@/src/components/features/catalog/ProductCatalogGrid";
import { Product360SpinModal } from "@/src/components/features/catalog/Product360SpinModal";
import { ProblemDetailsCard } from "@/src/components/shared/ProblemDetailsCard";
import { AICurationFeed } from "@/src/components/features/catalog/AICurationFeed";
import { ProductCatalogHeader } from "@/src/components/features/catalog/ProductCatalogHeader";
import { DiscoveryRepository } from "../../../lib/discoveryRepository";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";

export const ProductCatalogPage: React.FC<any> = ({ onSelectTryOn, onRequestMerchantCheckout, onAddToCart, userLocation, searchRadius = 25, onRadiusChange, onRequestLocationPermission, onAskAI, onOpenLens, discoveryRepository, onListingsChanged }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [personalizedProducts, setPersonalizedProducts] = useState<ProductItem[]>([]);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState<boolean>(false);
  const [genkitModalProduct, setGenkitModalProduct] = useState<ProductItem | null>(null);
  const [spin360Product, setSpin360Product] = useState<ProductItem | null>(null);
  const [spin360Angle, setSpin360Angle] = useState<number>(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(true);
  const [tiltX, setTiltX] = useState<number>(0);
  const [tiltY, setTiltY] = useState<number>(0);
  const [active360AngleIdx, setActive360AngleIdx] = useState<number>(0);
  const [spinMediaError, setSpinMediaError] = useState<string | null>(null);
  const handleSpin360 = async (product: ProductItem) => {
    setSpinMediaError(null);
    setSpin360Product(product);
    try {
      const generateSpin360 = httpsCallable(functions, "generateSpin360");
      const response = await generateSpin360({
        productId: product.id,
        name: product.name,
        category: product.category,
        image: product.image,
      });
      const media = response.data as { mediaUrl?: string; mediaType?: "image" | "video" };
      if (!media.mediaUrl) throw new Error("No generated product media was returned.");
      setSpin360Product(current => current && current.id === product.id
        ? { ...current, genMediaKit: { ...current.genMediaKit, videoUrl: media.mediaType === "video" ? media.mediaUrl : current.genMediaKit?.videoUrl } }
        : current);
    } catch (error) {
      Logger.error("Failed to generate product rotation media", error);
      setSpinMediaError("Product media could not be generated right now. You can still view the merchant listing.");
    }
  };
  useEffect(() => {
    if (!spin360Product || !isAutoSpinning) return;
    const interval = setInterval(() => setSpin360Angle(prev => (prev + 1.5) % 360), 30);
    return () => clearInterval(interval);
  }, [spin360Product, isAutoSpinning]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchPersonalizedFeed = async (cat: string) => {
    setIsLoadingPersonalized(true);
    setFetchError(null);
    try {
      const query = cat === "ALL" ? "current products matching my preferences" : `${cat} products`;
      const listings = await (discoveryRepository as DiscoveryRepository).search({ query, location: userLocation, radius: searchRadius });
      const items = (discoveryRepository as DiscoveryRepository).asProducts(listings);
      setPersonalizedProducts(items);
      onListingsChanged?.();
    } catch (err: any) {
      setFetchError("Unable to load product catalog. Please try again later.");
      setPersonalizedProducts([]);
    } finally {
      setIsLoadingPersonalized(false);
    }
  };
  useEffect(() => { fetchPersonalizedFeed(selectedCategory); }, [selectedCategory, userLocation, searchRadius]);
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
        onSelectCategory={setSelectedCategory}
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
      <ProductCatalogGrid products={personalizedProducts} isLoading={isLoadingPersonalized} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} onRequestMerchantCheckout={onRequestMerchantCheckout} onOpenLens={onOpenLens} setGenkitModalProduct={setGenkitModalProduct} setSpin360Product={handleSpin360} fetchFeed={() => fetchPersonalizedFeed(selectedCategory)} />
      {spinMediaError && <p className="text-xs text-[#a84a32]" role="alert">{spinMediaError}</p>}
      {spin360Product && <Product360SpinModal spin360Product={spin360Product} spin360Angle={spin360Angle} isAutoSpinning={isAutoSpinning} tiltX={tiltX} tiltY={tiltY} active360AngleIdx={active360AngleIdx} setSpin360Product={setSpin360Product} setSpin360Angle={setSpin360Angle} setIsAutoSpinning={setIsAutoSpinning} setTiltX={setTiltX} setTiltY={setTiltY} setActive360AngleIdx={setActive360AngleIdx} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />}
      {genkitModalProduct && <GenkitCreativeStudioModal product={genkitModalProduct} onClose={() => setGenkitModalProduct(null)} />}
      <AIShopperInputBar onSend={(t, img) => onAskAI?.(t, img)} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} placeholder="Ask Spresso AI about products..." className="mt-6" />
    </div>
  );
};
