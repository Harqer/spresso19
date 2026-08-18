import Logger from "../../../lib/Logger";
import React, { useState, useEffect, useMemo } from "react";
import { ProductItem, HITLPayload } from "../../../types";
import { dataConnect } from "../../../lib/firebase";
import { listProducts } from "@/src/dataconnect";
import { MaterialIcon } from "../../MaterialIcon";
import { GenkitCreativeStudioModal } from "../../GenkitCreativeStudioModal";
import { AIShopperInputBar } from "../../AIShopperInputBar";
import { ProductCatalogGrid } from "@/src/components/features/catalog/ProductCatalogGrid";
import { Product360SpinModal } from "@/src/components/features/catalog/Product360SpinModal";
import { ProblemDetailsCard } from "@/src/components/shared/ProblemDetailsCard";
import { AICurationFeed } from "@/src/components/features/catalog/AICurationFeed";
import { ProductCatalogHeader } from "@/src/components/features/catalog/ProductCatalogHeader";
export const ProductCatalogPage: React.FC<any> = ({ products: initialProducts, onSelectTryOn, onRequestHITLCheckout, onAddToCart, userLocation, searchRadius = 25, onRadiusChange, onRequestLocationPermission, onAskAI, onOpenLens }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [personalizedProducts, setPersonalizedProducts] = useState<ProductItem[]>(initialProducts);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState<boolean>(false);
  const [genkitModalProduct, setGenkitModalProduct] = useState<ProductItem | null>(null);
  const [spin360Product, setSpin360Product] = useState<ProductItem | null>(null);
  const [spin360Angle, setSpin360Angle] = useState<number>(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState<boolean>(true);
  const [tiltX, setTiltX] = useState<number>(0);
  const [tiltY, setTiltY] = useState<number>(0);
  const [active360AngleIdx, setActive360AngleIdx] = useState<number>(0);
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
      const response = await listProducts(dataConnect);
      if (response.data && response.data.products) {
        let dcProducts = response.data.products.map((p: any) => ({ ...p, virtualTryOnEligible: true, mcpServerId: "spresso-mcp-retail" })) as unknown as ProductItem[];
        if (cat !== "ALL") dcProducts = dcProducts.filter(p => p.name.toLowerCase().includes(cat.toLowerCase()) || p.description?.toLowerCase().includes(cat.toLowerCase()));
        setPersonalizedProducts(dcProducts.length === 0 ? [] : dcProducts);
      } else {
        setPersonalizedProducts([]);
      }
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
      <ProductCatalogGrid products={personalizedProducts} isLoading={isLoadingPersonalized} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} onRequestHITLCheckout={onRequestHITLCheckout} onOpenLens={onOpenLens} setGenkitModalProduct={setGenkitModalProduct} setSpin360Product={setSpin360Product} fetchFeed={() => fetchPersonalizedFeed(selectedCategory)} />
      {spin360Product && <Product360SpinModal spin360Product={spin360Product} spin360Angle={spin360Angle} isAutoSpinning={isAutoSpinning} tiltX={tiltX} tiltY={tiltY} active360AngleIdx={active360AngleIdx} setSpin360Product={setSpin360Product} setSpin360Angle={setSpin360Angle} setIsAutoSpinning={setIsAutoSpinning} setTiltX={setTiltX} setTiltY={setTiltY} setActive360AngleIdx={setActive360AngleIdx} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />}
      {genkitModalProduct && <GenkitCreativeStudioModal product={genkitModalProduct} onClose={() => setGenkitModalProduct(null)} />}
      <AIShopperInputBar onSend={(t, img) => onAskAI?.(t, img)} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} placeholder="Ask Spresso AI about products..." className="mt-6" />
    </div>
  );
};
