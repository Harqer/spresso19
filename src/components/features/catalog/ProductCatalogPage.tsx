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

export const CATEGORY_TILES = [
  { id: "ALL", label: "All Items", icon: "grid_view" },
  { id: "Trending", label: "Trending", icon: "local_fire_department" },
  { id: "Winter Wear", label: "Winter Wear", icon: "ac_unit" },
  { id: "Sports Wear", label: "Sports Wear", icon: "fitness_center" },
  { id: "Makeup", label: "Makeup & Beauty", icon: "brush" },
  { id: "Accessories", label: "Accessories", icon: "watch" },
  { id: "Smart Wearables", label: "Wearables", icon: "smart_toy" },
  { id: "Electronics", label: "Electronics", icon: "headphones" },
];

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
        setPersonalizedProducts(dcProducts.length === 0 ? initialProducts : dcProducts);
      } else {
        setPersonalizedProducts(initialProducts);
      }
    } catch (err: any) {
      setFetchError("Unable to load product catalog. Please try again later.");
      setPersonalizedProducts(initialProducts);
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
        const { authFetch } = await import("../../../lib/firebase");
        const res = await authFetch("/api/user/preferences");
        if (res.ok) {
          const data = await res.json();
          setUserPreferences({
            bookmarkedIds: data.bookmarkedIds || [],
            likedIds: data.likedIds || [],
            searchInquiries: data.searchInquiries || []
          });
        }
      } catch (err) {
        console.warn("Failed to fetch user preferences:", err);
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
      <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-[#18211e] font-headline">Products</h2><p className="text-xs text-[#5e635f]">{userLocation ? `Comparing deals & stock near ${userLocation} within a ${searchRadius}-mile radius` : "Browse products & compare local store deals"}</p></div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onRequestLocationPermission} className="px-3 py-1.5 bg-[#f2f8f2] hover:bg-[#e8f3e8] text-[#18211e] border border-[#d8ebd7] rounded-full text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs group"><MaterialIcon icon="location_on" size={14} className="text-[#386633]" /><span className="truncate max-w-[150px] font-bold">{userLocation ? `${userLocation} (${searchRadius} mi)` : "Set Location"}</span><MaterialIcon icon="unfold_more" size={14} className="text-[#5e635f] group-hover:text-[#386633]" /></button>
            <span className="text-xs text-[#5e635f] font-mono bg-[#f2f8f2] px-3 py-1.5 rounded-full font-semibold border border-[#d8ebd7]">{personalizedProducts.length} Items</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORY_TILES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex flex-col items-center justify-center p-3 min-w-[80px] rounded-2xl border transition-all cursor-pointer group ${isSelected ? "bg-[#386633] text-white border-[#386633] shadow-xs scale-105" : "bg-[#f2f8f2] text-[#18211e] border-[#d8ebd7] hover:border-[#386633] hover:bg-white"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition ${isSelected ? "bg-white/20 text-white" : "bg-white text-[#386633] shadow-xs"}`}><MaterialIcon icon={cat.icon} size={20} /></div>
                <span className="text-[11px] font-bold truncate max-w-[76px]">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedCategory === "ALL" && curatedPersonalizedProducts.length > 0 && (
        <div className="bg-gradient-to-r from-stone-900 via-[#1c2924] to-stone-900 text-white p-6 rounded-3xl border border-stone-800 shadow-md space-y-4 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider border border-white/20">
                AI Curation Feed
              </span>
              <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                <MaterialIcon icon="recommend" size={14} />
                <span>Personalized For You</span>
              </span>
            </div>
            
            <h3 className="font-headline font-semibold text-xs sm:text-sm text-stone-200">
              We are curating your personalized recommendations, exclusive deals, and trending styles based on your unique fashion profile as we learn more about your tastes.
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {curatedPersonalizedProducts.map(p => (
                <div key={p.id} onClick={() => onSelectTryOn(p)} className="bg-stone-950/40 p-3 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition cursor-pointer flex items-center space-x-3 group animate-scaleUp">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-stone-900">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition">{p.name}</h4>
                    <span className="text-[10px] text-stone-400 font-mono block">${p.price.toFixed(2)}</span>
                    {p.rating ? (
                    <div className="flex items-center space-x-1 text-[10px] font-bold text-[#191d16] dark:text-[#f8fafc] bg-[#eef3ea] dark:bg-[#283228] px-1.5 py-0.5 rounded-full">
                      <MaterialIcon icon="star" size={10} className="text-[#386633] dark:text-[#9cd695]" />
                      <span>{p.rating}</span>
                    </div>
                  ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
