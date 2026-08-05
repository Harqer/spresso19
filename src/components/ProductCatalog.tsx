import React, { useState, useEffect } from "react";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { GenkitCreativeStudioModal } from "./GenkitCreativeStudioModal";
import { AIShopperInputBar } from "./AIShopperInputBar";

interface ProductCatalogProps {
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAddToCart?: (product: ProductItem) => void;
  deviceMode?: string;
  userLocation?: string | null;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  onRequestLocationPermission?: () => void;
  onAskAI?: (text: string, image?: string | null) => void;
  onOpenLens?: (product: ProductItem) => void;
}

const CATEGORY_TILES = [
  { id: "ALL", label: "All Items", icon: "grid_view" },
  { id: "Trending", label: "Trending", icon: "local_fire_department" },
  { id: "Winter Wear", label: "Winter Wear", icon: "ac_unit" },
  { id: "Sports Wear", label: "Sports Wear", icon: "fitness_center" },
  { id: "Makeup", label: "Makeup & Beauty", icon: "brush" },
  { id: "Accessories", label: "Accessories", icon: "watch" },
  { id: "Smart Wearables", label: "Wearables", icon: "smart_toy" },
  { id: "Electronics", label: "Electronics", icon: "headphones" },
];

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products: initialProducts,
  onSelectTryOn,
  onRequestHITLCheckout,
  onAddToCart,
  userLocation,
  searchRadius = 25,
  onRadiusChange,
  onRequestLocationPermission,
  onAskAI,
  onOpenLens
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [personalizedProducts, setPersonalizedProducts] = useState<ProductItem[]>(initialProducts);
  const [isLoadingPersonalized, setIsLoadingPersonalized] = useState<boolean>(false);

  const [accessibilityModalProduct, setAccessibilityModalProduct] = useState<ProductItem | null>(null);
  const [genkitModalProduct, setGenkitModalProduct] = useState<ProductItem | null>(null);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
  const [active360ProductId, setActive360ProductId] = useState<string | null>(null);
  const [rotationAngles, setRotationAngles] = useState<Record<string, number>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("spresso_wardrobe_items");
      const parsed: string[] = saved ? JSON.parse(saved) : [];
      const map: Record<string, boolean> = {};
      parsed.forEach(id => { map[id] = true; });
      return map;
    } catch {
      return {};
    }
  });

  const toggleBookmark = (product: ProductItem) => {
    setBookmarkedIds(prev => {
      const isSaved = !!prev[product.id];
      const next = { ...prev, [product.id]: !isSaved };
      try {
        const savedList = Object.keys(next).filter(id => next[id]);
        localStorage.setItem("spresso_wardrobe_items", JSON.stringify(savedList));
      } catch (err) {
        console.error("Failed to update wardrobe bookmarks", err);
      }
      return next;
    });
  };

  // Fetch live web search research feed grounded by Gemini
  const fetchPersonalizedFeed = async (cat: string) => {
    setIsLoadingPersonalized(true);
    let recentSearches: string[] = [];
    try {
      const stored = localStorage.getItem("spresso_search_history");
      if (stored) recentSearches = JSON.parse(stored);
    } catch (e) {}

    try {
      const res = await fetch("/api/personalized-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          userLocation: userLocation || "United States",
          searchRadius,
          cartItemsCount: 0,
          recentSearches,
          userPreferences: recentSearches.length > 0 ? recentSearches.join(", ") : "Hot Drops, Macy's Deals, Footwear, Fashion & Tech"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.products && Array.isArray(data.products)) {
          setPersonalizedProducts(data.products);
        } else {
          setPersonalizedProducts(initialProducts);
        }
      } else {
        setPersonalizedProducts(initialProducts);
      }
    } catch (err) {
      console.warn("Failed to fetch personalized feed:", err);
      setPersonalizedProducts(initialProducts);
    } finally {
      setIsLoadingPersonalized(false);
    }
  };

  useEffect(() => {
    fetchPersonalizedFeed(selectedCategory);
  }, [selectedCategory, userLocation, searchRadius]);

  const handleCheckout = (product: ProductItem) => {
    const payload: HITLPayload = {
      authorizationId: `ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        sku: product.sku,
        image: product.image
      },
      quantity: 1,
      totalAmount: product.price,
      currency: product.currency,
      deviceSource: "WEB",
      inventoryConfirmed: product.stock > 0,
      stockRemaining: product.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Authorize $${product.price.toFixed(2)} for ${product.name}?`,
        safetyChecks: [
          "In stock and ready to ship",
          "Includes free express delivery",
          "Click confirm to place order"
        ]
      }
    };

    onRequestHITLCheckout(payload);
  };

  return (
    <div className="space-y-6">
      {/* Category Bar & Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#18211e] font-headline">Products</h2>
            <p className="text-xs text-[#5e635f]">
              {userLocation ? `Comparing deals & stock near ${userLocation} within a ${searchRadius}-mile radius` : "Browse products & compare local store deals"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRequestLocationPermission}
              className="px-3 py-1.5 bg-[#f2f8f2] hover:bg-[#e8f3e8] text-[#18211e] border border-[#d8ebd7] rounded-full text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs group"
              title="Click to adjust location or search radius"
            >
              <MaterialIcon icon="location_on" size={14} className="text-[#386633]" />
              <span className="truncate max-w-[150px] font-bold">
                {userLocation ? `${userLocation} (${searchRadius} mi)` : "Set Location"}
              </span>
              <MaterialIcon icon="unfold_more" size={14} className="text-[#5e635f] group-hover:text-[#386633]" />
            </button>

            <span className="text-xs text-[#5e635f] font-mono bg-[#f2f8f2] px-3 py-1.5 rounded-full font-semibold border border-[#d8ebd7]">
              {personalizedProducts.length} Items
            </span>
          </div>
        </div>

        {/* Circular / Rounded Category Tiles */}
        <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORY_TILES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center justify-center p-3 min-w-[80px] rounded-2xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "bg-[#386633] text-white border-[#386633] shadow-xs scale-105"
                    : "bg-[#f2f8f2] text-[#18211e] border-[#d8ebd7] hover:border-[#386633] hover:bg-white"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition ${
                  isSelected ? "bg-white/20 text-white" : "bg-white text-[#386633] shadow-xs"
                }`}>
                  <MaterialIcon icon={cat.icon} size={20} />
                </div>
                <span className="text-[11px] font-bold truncate max-w-[76px]">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoadingPersonalized && (
        <div className="p-4 bg-[#e8f3e8]/60 border border-[#d8ebd7] rounded-2xl flex items-center space-x-3 text-xs text-[#386633] font-medium animate-pulse">
          <MaterialIcon icon="refresh" size={18} className="animate-spin text-[#386633]" />
          <span>Loading products...</span>
        </div>
      )}

      {/* Grid of Personalized Product Cards */}
      {!isLoadingPersonalized && personalizedProducts.length === 0 ? (
        <div className="p-10 bg-white rounded-3xl border border-[#d8ebd7] text-center space-y-4 max-w-md mx-auto my-6 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#e8f3e8] text-[#386633] flex items-center justify-center mx-auto">
            <MaterialIcon icon="search" size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-[#18211e]">No Live Search Results Loaded</h3>
            <p className="text-xs text-[#5e635f]">
              Chat with Spresso AI Personal Shopper to express what you are looking for, or run a live search for current hot drops and retail deals.
            </p>
          </div>
          <button
            onClick={() => fetchPersonalizedFeed(selectedCategory)}
            className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 mx-auto"
          >
            <MaterialIcon icon="refresh" size={16} />
            <span>Search Live Deals & Trends</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {personalizedProducts.map(product => {
          const origPrice = product.originalPrice || Math.round(product.price * 1.15);
          const discountPct = Math.round(((origPrice - product.price) / origPrice) * 100);

          return (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-[#d8ebd7] hover:border-[#386633] transition-all duration-300 overflow-hidden shadow-xs flex flex-col justify-between group"
            >
              <div>
                {/* Image Header */}
                <div className="relative aspect-square overflow-hidden bg-[#f2f8f2] rounded-2xl group/img">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={
                      active360ProductId === product.id
                        ? { transform: `rotateY(${rotationAngles[product.id] || 0}deg)` }
                        : undefined
                    }
                  />

                  {/* Bookmark/Save to Wardrobe Button */}
                  <button
                    type="button"
                    onClick={() => toggleBookmark(product)}
                    className={`absolute bottom-3 left-3 p-2 rounded-full backdrop-blur-md transition cursor-pointer shadow-md border ${
                      bookmarkedIds[product.id]
                        ? "bg-[#386633] text-white border-[#386633]"
                        : "bg-white/90 text-[#386633] border-[#d8ebd7] hover:bg-white hover:scale-105"
                    }`}
                    title={bookmarkedIds[product.id] ? "Saved in Wardrobe (Click to remove)" : "Save to Wardrobe"}
                  >
                    <MaterialIcon icon={bookmarkedIds[product.id] ? "bookmark" : "bookmark_add"} size={16} />
                  </button>
                  {product.matchScore && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full shadow-md flex items-center space-x-1">
                      <MaterialIcon icon="auto_awesome" size={12} />
                      <span>{product.matchScore}% Match</span>
                    </span>
                  )}

                  {/* Google Lens Identification Button */}
                  <button
                    type="button"
                    onClick={() => onOpenLens && onOpenLens(product)}
                    className="absolute top-3 right-3 px-2.5 py-1 bg-stone-900/80 hover:bg-orange-600 text-white backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold rounded-full shadow-md flex items-center space-x-1 transition cursor-pointer hover:scale-105"
                    title="Tap to identify object with Google Lens & view cost listing"
                  >
                    <MaterialIcon icon="center_focus_strong" size={13} className="text-orange-400" />
                    <span>Lens Cost & Info</span>
                  </button>

                  {/* 360° Button on the Right Side of the Product Image */}
                  <button
                    onClick={() =>
                      setActive360ProductId(prev => (prev === product.id ? null : product.id))
                    }
                    className={`absolute bottom-3 right-3 px-2.5 py-1.5 rounded-full border backdrop-blur-md transition cursor-pointer flex items-center space-x-1 shadow-sm font-mono text-[10px] font-bold ${
                      active360ProductId === product.id
                        ? "bg-[#386633] text-white border-[#386633]"
                        : "bg-white/90 text-[#18211e] border-[#d8ebd7] hover:bg-[#e8f3e8]"
                    }`}
                    title="360° Interactive Product View"
                  >
                    <MaterialIcon icon="360" size={16} />
                    <span>360°</span>
                  </button>

                  {/* 360 Rotation Control Overlay when Active */}
                  {active360ProductId === product.id && (
                    <div className="absolute inset-x-2 bottom-12 bg-white/95 backdrop-blur-md border border-[#d8ebd7] rounded-xl p-2 space-y-1 shadow-md z-10 animate-fadeIn">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#386633] font-bold">
                        <span className="flex items-center space-x-1">
                          <MaterialIcon icon="360" size={14} />
                          <span>360° Rotate Product</span>
                        </span>
                        <span>{rotationAngles[product.id] || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={rotationAngles[product.id] || 0}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setRotationAngles(prev => ({ ...prev, [product.id]: val }));
                        }}
                        className="w-full accent-[#386633] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Info Body */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#5e635f] tracking-wider">
                        {product.brand}
                      </span>
                      <div className="flex items-center space-x-1 text-amber-600 text-xs font-bold">
                        <MaterialIcon icon="star" size={14} filled className="text-amber-500" />
                        <span>{product.rating}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-[#18211e]">{product.name}</h3>
                    <p className="text-xs text-[#5e635f] line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>

                    {/* AI Personalization Reason Tag */}
                    {product.personalizationReason && (
                      <div className="p-2.5 bg-[#f2f8f2] rounded-xl border border-[#d8ebd7] text-[11px] text-[#2d4d29] space-y-0.5">
                        <div className="flex items-center space-x-1 font-bold text-[#386633]">
                          <MaterialIcon icon="psychology" size={14} />
                          <span>Why For You:</span>
                        </div>
                        <p className="leading-snug text-[#48524d]">{product.personalizationReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Pricing & Actions Row */}
                  <div className="pt-3 border-t border-[#f2f8f2] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#5e635f] block font-mono">Spresso AI Price</span>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-lg font-bold text-[#386633] font-mono">
                            ${product.price.toFixed(2)}
                          </span>
                          {origPrice > product.price && (
                            <>
                              <span className="text-xs text-[#8c918e] line-through font-mono">
                                ${origPrice.toFixed(2)}
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-[#386633] text-[9px] font-bold font-mono rounded">
                                SAVE {discountPct}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {/* Brand Studio Button */}
                        <button
                          onClick={() => setGenkitModalProduct(product)}
                          className="px-2.5 py-2 rounded-xl bg-stone-100 hover:bg-[#386633] text-[#18211e] hover:text-white border border-[#d8ebd7] text-xs font-bold transition cursor-pointer flex items-center space-x-1 shadow-xs"
                          title="Brand Creative & Product Ideation Studio"
                        >
                          <MaterialIcon icon="auto_awesome" size={16} className="text-[#386633] group-hover:text-white" />
                          <span className="hidden md:inline font-mono">Studio</span>
                        </button>

                        {/* Virtual Try-On & Animation Button */}
                        <button
                          onClick={() => onSelectTryOn(product)}
                          className="px-3 py-2 rounded-xl bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white border border-[#386633]/30 text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                          title="Virtual Avatar Try-On & Animation"
                        >
                          <MaterialIcon icon="animation" size={18} />
                          <span>Animate</span>
                        </button>

                        {/* Add to Cart */}
                        <button
                          onClick={() => {
                            if (onAddToCart) {
                              onAddToCart(product);
                              setAddedToCartId(product.id);
                              setTimeout(() => setAddedToCartId(null), 2000);
                            }
                          }}
                          className={`p-2.5 rounded-xl border transition cursor-pointer ${
                            addedToCartId === product.id
                              ? "bg-[#386633] text-white border-[#386633]"
                              : "bg-white hover:bg-[#e8f3e8] text-[#18211e] border-[#b0d4af]"
                          }`}
                          title="Add to Cart"
                        >
                          <MaterialIcon icon={addedToCartId === product.id ? "check" : "add_shopping_cart"} size={18} />
                        </button>

                        {/* Buy Now Button */}
                        <button
                          onClick={() => handleCheckout(product)}
                          className="p-2.5 rounded-xl bg-[#386633] hover:bg-[#2c5227] text-white transition shadow-xs cursor-pointer"
                          title="Buy Item"
                        >
                          <MaterialIcon icon="shopping_bag" size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Settings / Accessibility Modal */}
      {accessibilityModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#d8ebd7] shadow-2xl relative">
            <button
              onClick={() => setAccessibilityModalProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#e8f3e8] text-[#5e635f] transition cursor-pointer"
            >
              <MaterialIcon icon="close" size={20} />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#e8f3e8] text-[#386633] rounded-2xl">
                <MaterialIcon icon="accessibility_new" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#18211e]">Material 3 Accessibility & Fit Settings</h3>
                <p className="text-xs text-[#5e635f] truncate max-w-[240px]">{accessibilityModalProduct.name}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-[#f2f8f2] p-4 rounded-2xl border border-[#d8ebd7]">
              <div className="flex items-center justify-between py-1 border-b border-[#d8ebd7]">
                <span className="font-semibold text-[#18211e]">Screen Reader Alt Text</span>
                <span className="text-[#386633] font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#d8ebd7]">
                <span className="font-semibold text-[#18211e]">Haptic Feedback for Smart Glasses</span>
                <span className="text-[#386633] font-bold">Active</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="font-semibold text-[#18211e]">High-Contrast Color Mode</span>
                <span className="text-[#386633] font-bold">Auto</span>
              </div>
            </div>

            <button
              onClick={() => setAccessibilityModalProduct(null)}
              className="w-full py-2.5 bg-[#386633] text-white rounded-xl font-bold text-xs hover:bg-[#2c5227] transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Genkit Creative Intelligence Studio Modal */}
      {genkitModalProduct && (
        <GenkitCreativeStudioModal
          product={genkitModalProduct}
          onClose={() => setGenkitModalProduct(null)}
        />
      )}

      {/* Global AI Communication Input Bar */}
      <AIShopperInputBar
        onSend={(t, img) => onAskAI?.(t, img)}
        onSelectTryOn={onSelectTryOn}
        onAddToCart={onAddToCart}
        placeholder="Ask Spresso AI Personal Shopper about products..."
        className="mt-6"
      />
    </div>
  );
};

