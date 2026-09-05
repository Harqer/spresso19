import Logger from "../lib/Logger";
import React, { useState, useMemo, useEffect } from "react";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { motion, AnimatePresence } from "motion/react";
import { ProductItem, HITLPayload, CustomWardrobeItem, GeneratedOutfit } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { ArcFanLayout } from "./ArcFanLayout";

interface StackedWardrobeDecksProps {
  userUploadedItems: CustomWardrobeItem[];
  bookmarkedItems: CustomWardrobeItem[];
  likedProducts: any[];
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onOpenUploadModal: () => void;
  onSaveFavoriteOutfit: (outfit: GeneratedOutfit) => void;
}

export interface DeckCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  outfits: GeneratedOutfit[];
  singleItems?: CustomWardrobeItem[];
}

export const StackedWardrobeDecks: React.FC<StackedWardrobeDecksProps> = ({
  userUploadedItems,
  bookmarkedItems,
  likedProducts,
  products,
  onSelectTryOn,
  onRequestHITLCheckout,
  onOpenUploadModal,
  onSaveFavoriteOutfit,
}) => {
  const [expandedDeckId, setExpandedDeckId] = useState<string | null>("ai-curated");
  const [selectedOutfitDetail, setSelectedOutfitDetail] = useState<GeneratedOutfit | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [fanViewMode, setFanViewMode] = useState<"ARC_FAN" | "GRID">("ARC_FAN");

  // Convert Liked products to CustomWardrobeItem structure
  const likedWardrobeItems: CustomWardrobeItem[] = useMemo(() => {
    return likedProducts.map((p, idx) => ({
      id: `liked-${p.id || p.sku || idx}`,
      type: "bookmarked_product",
      name: p.name || "Liked Fashion Piece",
      category: p.category?.toUpperCase()?.includes("SHOE") ? "SHOES" : p.name?.toLowerCase()?.includes("pant") ? "BOTTOM" : "TOP",
      weatherSuitability: "ALL_WEATHER",
      image: p.image || "",
      brand: p.brand || "Liked Product",
      price: typeof p.price === "number" ? p.price : p.price ? Number(p.price) : undefined,
      productId: p.id || p.sku,
      addedAt: Date.now() - idx * 1000,
    }));
  }, [likedProducts]);

  // Combined item pool from all sources
  const poolItems = useMemo(() => {
    return [...userUploadedItems, ...bookmarkedItems, ...likedWardrobeItems];
  }, [userUploadedItems, bookmarkedItems, likedWardrobeItems]);

  const [curatedDecks, setCuratedDecks] = useState<DeckCategory[]>([]);

  useEffect(() => {
    const fetchCurated = async () => {
      try {
        const curateWardrobe = httpsCallable(functions, "curateWardrobe");
        const res = await curateWardrobe({ userUploadedItems, bookmarkedItems, likedProducts: likedWardrobeItems, shuffleSeed });
        const data: any = res.data;
        if (data && data.decks) {
          setCuratedDecks(data.decks);
        }
      } catch (err) {
        Logger.error("Failed to fetch curated outfits", err);
      }
    };
    fetchCurated();
  }, [userUploadedItems, bookmarkedItems, likedWardrobeItems, shuffleSeed]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Header with Jetpack Compose Jetpack Stack Controls */}
      <div className="bg-gradient-to-r from-stone-900 via-[#18211e] to-stone-900 text-white p-6 rounded-3xl border border-stone-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#386633]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-medium text-emerald-300">Interactive wardrobe</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {poolItems.length} Curated Items Pool
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-headline text-white flex items-center space-x-2">
              <MaterialIcon icon="style" size={24} className="text-emerald-400" />
              <span>Stacked Wardrobe Cards & AI Smart Fits</span>
            </h2>
            <p className="text-xs text-stone-300 leading-relaxed">
              Tap any stacked card deck to fan out and explore AI-curated fashion looks generated from your <span className="text-amber-300 font-bold">Photo Gallery</span>, <span className="text-rose-300 font-bold">Liked Items</span>, and <span className="text-emerald-300 font-bold">Store Bookmarks</span>!
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setShuffleSeed((s) => s + 1)}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#386633] hover:from-emerald-500 hover:to-[#2c5227] text-white rounded-2xl text-xs font-bold transition shadow-md cursor-pointer flex items-center space-x-2 active:scale-95"
            >
              <MaterialIcon icon="casino" size={18} />
              <span>Re-Curate AI Fits</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
            >
              <MaterialIcon icon="add_a_photo" size={16} />
              <span>Add Photos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stacked Cards Grid Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {curatedDecks.map((deck) => {
          const isExpanded = expandedDeckId === deck.id;
          const topOutfit = deck.outfits[0];
          const secondOutfit = deck.outfits[1] || topOutfit;
          const thirdOutfit = deck.outfits[2] || topOutfit;

          return (
            <motion.div
              key={deck.id}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl border transition-all duration-300 ${
                isExpanded
                  ? "border-[var(--md-sys-color-primary)] shadow-lg ring-2 ring-[var(--md-sys-color-primary)]/20 md:col-span-2 p-6"
                  : "border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] shadow-xs hover:shadow-md p-5 cursor-pointer"
              }`}
            >
              {/* Deck Header Bar */}
              <div
                onClick={() => setExpandedDeckId(isExpanded ? null : deck.id)}
                className="flex items-center justify-between pb-4 border-b border-[var(--md-sys-color-outline-variant)] cursor-pointer group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)] group-hover:scale-105 transition">
                    <MaterialIcon icon={deck.icon} size={22} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-base text-[var(--md-sys-color-on-surface)] font-headline">{deck.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-0.5">{deck.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-[var(--md-sys-color-primary)] hidden sm:inline">
                    {isExpanded ? "Collapse Stack" : "Tap to Fan Out"}
                  </span>
                  <div className={`p-2 rounded-full bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] transition-transform duration-300 ${isExpanded ? "rotate-180 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]" : ""}`}>
                    <MaterialIcon icon="expand_more" size={20} />
                  </div>
                </div>
              </div>

              {/* UNEXPANDED: STACKED DECK VISUALIZATION (Jetpack Compose Fan-Out Preview) */}
              {!isExpanded && (
                <div
                  onClick={() => setExpandedDeckId(deck.id)}
                  className="pt-6 pb-2 px-4 cursor-pointer flex justify-center items-center select-none"
                >
                  <div className="relative w-full max-w-sm h-64 flex items-center justify-center">
                    {/* Layer 3 (Bottom Card - Rotated -6deg) */}
                    <div className="absolute inset-x-4 top-0 h-52 bg-[var(--md-sys-color-surface-container)] rounded-2xl border border-[var(--md-sys-color-outline-variant)] shadow-sm transform -rotate-6 translate-y-4 opacity-75 overflow-hidden">
                      {thirdOutfit?.items[0] && (
                        <img src={thirdOutfit.items[0].image} alt="Layer 3" className="w-full h-full object-cover opacity-40 blur-[1px]" />
                      )}
                    </div>

                    {/* Layer 2 (Middle Card - Rotated +6deg) */}
                    <div className="absolute inset-x-2 top-1 h-52 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-[var(--md-sys-color-outline-variant)] shadow-md transform rotate-6 translate-y-2 opacity-90 overflow-hidden">
                      {secondOutfit?.items[0] && (
                        <img src={secondOutfit.items[0].image} alt="Layer 2" className="w-full h-full object-cover opacity-60" />
                      )}
                    </div>

                    {/* Layer 1 (Top Hero Card - Rotated 0deg) */}
                    <div className="absolute inset-0 h-52 bg-[var(--md-sys-color-surface-container-lowest)] rounded-2xl border-2 border-[var(--md-sys-color-primary)] shadow-xl overflow-hidden flex flex-col justify-between p-3 group-hover:scale-102 transition duration-300">
                      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-[var(--md-sys-color-surface-container)]">
                        {topOutfit?.items[0] ? (
                          <div className="grid grid-cols-3 h-full gap-1 p-1">
                            {topOutfit.items.slice(0, 3).map((it, idx) => (
                              <img key={idx} src={it.image} alt={it.name} className="w-full h-full object-cover rounded-lg" />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)]">
                            <MaterialIcon icon="photo_library" size={32} />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[9px] font-mono font-bold">
                          Tap to Fan Out Stack ({deck.outfits.length} Fits)
                        </span>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-[var(--md-sys-color-primary)] block">
                            {topOutfit?.temperatureText || "AI Curated Fit"}
                          </span>
                          <h4 className="font-bold text-xs text-[var(--md-sys-color-on-surface)] line-clamp-1">
                            {topOutfit?.title || "Explore Outfit Stack"}
                          </h4>
                        </div>
                        <div className="px-3 py-1 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-xl text-[10px] font-bold flex items-center space-x-1">
                          <MaterialIcon icon="unfold_more" size={14} />
                          <span>Expand</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPANDED: FANNED-OUT CARDS VIEW (Interactive Jetpack Deck Fan-Out) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-6 space-y-6"
                  >
                    <div className="flex flex-wrap items-center justify-between bg-[#f2f8f2] p-3 rounded-2xl border border-[#d8ebd7] gap-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-[#386633]">
                        <MaterialIcon icon="style" size={18} />
                        <span>Fanned-Out Outfits ({deck.outfits.length} Curated Fits Available)</span>
                      </div>

                      {/* Card View Mode Selector */}
                      <div className="flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-[#d8ebd7] shadow-2xs">
                        <button
                          onClick={() => setFanViewMode("ARC_FAN")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                            fanViewMode === "ARC_FAN"
                              ? "bg-[#386633] text-white shadow-xs"
                              : "text-[#5e635f] hover:text-[#18211e]"
                          }`}
                        >
                          <MaterialIcon icon="3d_rotation" size={15} />
                          <span>Circular Arc Fan</span>
                        </button>
                        <button
                          onClick={() => setFanViewMode("GRID")}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                            fanViewMode === "GRID"
                              ? "bg-[#386633] text-white shadow-xs"
                              : "text-[#5e635f] hover:text-[#18211e]"
                          }`}
                        >
                          <MaterialIcon icon="grid_view" size={15} />
                          <span>Grid Cards</span>
                        </button>
                      </div>
                    </div>

                    {/* CIRCULAR ARC FAN VIEW vs GRID VIEW */}
                    {fanViewMode === "ARC_FAN" ? (
                      <ArcFanLayout
                        outfits={deck.outfits.length > 0 ? deck.outfits : undefined}
                        singleItems={deck.singleItems && deck.outfits.length === 0 ? deck.singleItems : undefined}
                        onSelectOutfit={(outfit) => setSelectedOutfitDetail(outfit)}
                        onSelectItem={(item) => {
                          const p = products.find((prod) => prod.id === item.id || prod.sku === item.id);
                          if (p) onSelectTryOn(p);
                        }}
                      />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {deck.outfits.map((outfit, index) => (
                          <motion.div
                            key={outfit.id}
                            initial={{ opacity: 0, y: 20, rotate: (index % 3 - 1) * 3 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{ delay: index * 0.08 }}
                            onClick={() => setSelectedOutfitDetail(outfit)}
                            className="bg-[#f9fbf9] p-4 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] hover:shadow-md transition cursor-pointer space-y-3 group flex flex-col justify-between"
                          >
                          {/* Outfit Header */}
                          <div className="flex items-center justify-between border-b border-[#e8f3e8] pb-2">
                            <span className="px-2 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded-md">
                              {outfit.temperatureText}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#386633] flex items-center space-x-1">
                              <MaterialIcon icon="check_circle" size={12} />
                              <span>Weather Ready</span>
                            </span>
                          </div>

                          <h4 className="font-bold text-xs text-[#18211e] group-hover:text-[#386633] transition line-clamp-1">
                            {outfit.title}
                          </h4>

                          {/* Outfit Items Collage Grid */}
                          <div className="grid grid-cols-3 gap-1.5 aspect-[16/10] bg-white p-1 rounded-xl border border-[#d8ebd7] overflow-hidden">
                            {outfit.items.slice(0, 3).map((item, i) => (
                              <div key={i} className="relative h-full rounded-lg overflow-hidden bg-[#f2f8f2]">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <span className="absolute bottom-1 left-1 text-[8px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                                  {item.type === "user_upload" ? "Gallery" : "Shop"}
                                </span>
                              </div>
                            ))}
                          </div>

                          <p className="text-[11px] text-[#5e635f] line-clamp-2 leading-relaxed bg-white/80 p-2 rounded-xl border border-[#d8ebd7]">
                            {outfit.stylingAdvice}
                          </p>

                          <div className="pt-2 flex items-center justify-between border-t border-[#e8f3e8]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSaveFavoriteOutfit(outfit);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer"
                            >
                              <MaterialIcon icon="star" size={13} />
                              <span>Bookmark Fit</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOutfitDetail(outfit);
                              }}
                              className="px-3 py-1 bg-[#386633] text-white rounded-lg text-[10px] font-bold hover:bg-[#2c5227] transition flex items-center space-x-1 cursor-pointer"
                            >
                              <MaterialIcon icon="visibility" size={13} />
                              <span>Inspect Look</span>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    )}

                    {/* Single Items Grid inside Deck if available */}
                    {deck.singleItems && deck.singleItems.length > 0 && (
                      <div className="pt-4 space-y-3">
                        <h4 className="text-xs font-bold text-[#18211e] font-headline uppercase tracking-wider font-mono">
                          Stacked Single Wardrobe Pieces ({deck.singleItems.length} Items)
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {deck.singleItems.map((item) => (
                            <div key={item.id} className="bg-white p-2.5 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] transition flex flex-col justify-between space-y-2 group shadow-2xs">
                              <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f2f8f2]">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/70 text-white">
                                  {item.type === "user_upload" ? "Gallery" : "Shop"}
                                </span>
                              </div>

                              <div>
                                <span className="text-[9px] font-mono font-bold text-[#386633] uppercase block line-clamp-1">
                                  {item.category.replace("_", " ")}
                                </span>
                                <h5 className="font-bold text-[11px] text-[#18211e] line-clamp-1">{item.name}</h5>
                              </div>

                              {item.productId && (
                                <button
                                  onClick={() => {
                                    const p = products.find((prod) => prod.id === item.productId);
                                    if (p) onSelectTryOn(p);
                                  }}
                                  className="w-full py-1 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white rounded-lg text-[10px] font-bold transition cursor-pointer text-center"
                                >
                                  Try On
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Outfit Detailed Inspect Modal */}
      {selectedOutfitDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-[#d8ebd7] shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
              <div>
                <span className="text-[11px] font-medium text-[#386633]">Styled outfit</span>
                <h3 className="text-lg font-bold text-[#18211e] font-headline mt-1">
                  {selectedOutfitDetail.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedOutfitDetail(null)}
                className="p-1.5 rounded-full text-[#5e635f] hover:bg-stone-100 cursor-pointer"
              >
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>

            {/* Pieces Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#5e635f] uppercase tracking-wider font-mono">
                Outfit Clothing Pieces ({selectedOutfitDetail.items.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedOutfitDetail.items.map((it) => (
                  <div key={it.id} className="bg-[#f9fbf9] p-3 rounded-2xl border border-[#d8ebd7] space-y-2 flex flex-col justify-between">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-black/70 text-white">
                        {it.type === "user_upload" ? "Photo Gallery" : "Shop Item"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#386633] uppercase block">
                        {it.category.replace("_", " ")}
                      </span>
                      <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{it.name}</h5>
                    </div>

                    {it.productId && (
                      <button
                        onClick={() => {
                          const p = products.find((prod) => prod.id === it.productId);
                          if (p) {
                            setSelectedOutfitDetail(null);
                            onRequestHITLCheckout({
                              authorizationId: `ORDER-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
                              product: { id: p.id, name: p.name, price: p.price, sku: p.sku, image: p.image },
                              quantity: 1,
                              totalAmount: p.price,
                              currency: p.currency,
                              deviceSource: "WEB",
                              availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
                              humanInTheLoopChallenge: {
                                title: "Confirm Purchase",
                                message: `Authorize $${p.price.toFixed(2)} for ${p.name}?`,
                                safetyChecks: [
                                  "Merchant availability will be verified at checkout",
                                  "Spresso does not own or reserve retailer inventory",
                                  "Review the merchant quote and confirm only if you want to proceed"
                                ]
                              }
                            });
                          }
                        }}
                        className="w-full py-1 bg-[#386633] text-white rounded-lg text-[10px] font-bold hover:bg-[#2c5227] transition cursor-pointer text-center"
                      >
                        {it.price != null ? `Buy $${it.price.toFixed(2)}` : "Buy Item"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Styling Notes */}
            <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-1">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[#386633]">
                <MaterialIcon icon="psychology" size={16} />
                <span>Spresso Personal Stylist Notes:</span>
              </div>
              <p className="text-xs text-[#48524d] leading-relaxed">
                {selectedOutfitDetail.stylingAdvice}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#f2f8f2] flex items-center justify-between">
              <button
                onClick={() => {
                  onSaveFavoriteOutfit(selectedOutfitDetail);
                  setSelectedOutfitDetail(null);
                }}
                className="px-4 py-2 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white border border-[#d8ebd7] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1"
              >
                <MaterialIcon icon="star" size={16} />
                <span>Bookmark to Favorites</span>
              </button>

              <button
                onClick={() => setSelectedOutfitDetail(null)}
                className="px-5 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold hover:bg-[#2c5227] transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
