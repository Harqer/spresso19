import Logger from "../lib/Logger";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon";
import { ElevatedQuickActionFab } from "./ElevatedQuickActionFab";
import { LocationDetailsView } from "./LocationDetailsView";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { ErrorStateFallback } from "./shared/Fallbacks";
import { GoogleLensCategoryTabs } from "./features/vision/GoogleLensCategoryTabs";


interface GoogleLensScreenWidgetModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSearchComplete?: (queryText: string, imageBase64: string) => void;
  onSelectTryOn?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  initialProduct?: any;
}

interface LensRegion {
  id: number;
  label: string;
  price?: string;
  source?: string;
  thumbnail?: string;
  category?: string;
  description?: string;
  isLocation?: boolean;
  catalogMatched?: boolean;
  productId?: string;
  merchantUrl?: string;
  availabilityStatus?: "UNKNOWN" | "VERIFY_AT_MERCHANT_CHECKOUT" | "AVAILABLE" | "UNAVAILABLE";
  sku?: string;
  rating?: number;
  reviewCount?: number;
  reviewSummary?: string;
  videoUrl?: string;
  currency?: string;
  observedPriceAmount?: number;
  listing?: LensListing;
  virtualTryOnEligible?: boolean;
}

type LensListing = {
  id?: unknown;
  name?: unknown;
  brand?: unknown;
  category?: unknown;
  imageUrl?: unknown;
  merchantUrl?: unknown;
  providerListingId?: unknown;
  observedPrice?: { amount?: unknown; currency?: unknown; evidenceUrl?: unknown };
  videoUrl?: unknown;
  rating?: unknown;
  reviewCount?: unknown;
  reviewSummary?: unknown;
  source?: unknown;
  discoveredAt?: unknown;
  expiresAt?: unknown;
  confidence?: unknown;
};

const formatObservedPrice = (amount?: number, currency = "USD") => {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return undefined;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const GoogleLensScreenWidgetModal: React.FC<GoogleLensScreenWidgetModalProps> = ({
  isOpen,
  onClose,
  onSearchComplete,
  onSelectTryOn,
  onAddToCart,
  initialProduct,
}) => {
  const [screenSnapshot, setScreenSnapshot] = useState<string | null>(null);
  const [isCapturingScreen, setIsCapturingScreen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [detectedRegions, setDetectedRegions] = useState<LensRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number>(0);
  const [showLocationDetails, setShowLocationDetails] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        // If triggered directly by clicking an animated video or product image
        const initItem = {
          id: 0,
          label: initialProduct.name || "",
          price: formatObservedPrice(initialProduct.price, initialProduct.currency || "USD"),
          source: initialProduct.brand || "",
          thumbnail: initialProduct.image || "",
          category: initialProduct.category || "",
          description: initialProduct.description || "",
          catalogMatched: Boolean(initialProduct.id),
          productId: initialProduct.id,
          availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT" as const,
          sku: initialProduct.sku,
          rating: initialProduct.rating,
          reviewCount: initialProduct.reviewCount,
          reviewSummary: initialProduct.reviewSummary,
          videoUrl: initialProduct.genMediaKit?.videoUrl,
          currency: initialProduct.currency || "USD",
          observedPriceAmount: typeof initialProduct.price === "number" ? initialProduct.price : undefined,
          listing: initialProduct.listing,
          virtualTryOnEligible: initialProduct.virtualTryOnEligible === true,
        };
        setDetectedRegions([initItem]);
        setSelectedRegionId(0);
      } else {
        setScreenSnapshot(null);
        setErrorMessage(null);
      }
    } else {
      setScreenSnapshot(null);
      setDetectedRegions([]);
      setSelectedRegionId(0);
    }
  }, [isOpen, initialProduct]);

  const captureCurrentAppScreen = async () => {
    setIsCapturingScreen(true);
    let activeStream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen capture is not supported by this browser.");
      }
      activeStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser", frameRate: { ideal: 1, max: 5 } },
        audio: false,
      });
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "hidden";
      const video = document.createElement("video");
      video.srcObject = activeStream;
      video.muted = true;
      await video.play();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (!canvas.width || !canvas.height) throw new Error("The selected screen has no capturable video frame.");
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
      setScreenSnapshot(dataUrl);
      await runGoogleLensScreenAnalysis(dataUrl);
    } catch (err) {
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "visible";

      setErrorMessage("Failed to capture screen content. Please try again.");
      Logger.error("Screen capture failed", err);
    } finally {
      activeStream?.getTracks().forEach((track) => track.stop());
      document.getElementById("google-lens-modal-container")?.style.setProperty("visibility", "visible");
      setIsCapturingScreen(false);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setScreenSnapshot(dataUrl);
        runGoogleLensScreenAnalysis(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const runGoogleLensScreenAnalysis = async (imageBase64: string) => {
    setIsScanning(true);

    try {
      const estimatedBytes = Math.floor((imageBase64.length * 3) / 4);
      if (estimatedBytes > 5 * 1024 * 1024) {
        throw new Error("This capture is too large. Please capture a smaller area and try again.");
      }
      const { functions } = await import("../lib/firebase");
      const { httpsCallable } = await import("firebase/functions");
      const lensSearch = httpsCallable(functions, "lensSearch");

      const res = await lensSearch({ imageBase64 });
      const data = ((res.data as any)?.result ?? res.data) as { listings?: LensListing[] };
      const listings = Array.isArray(data.listings) ? data.listings : [];
      const regions = listings.flatMap((listing, index): LensRegion[] => {
        const id = typeof listing.id === "string" && listing.id.trim() ? listing.id : undefined;
        const label = typeof listing.name === "string" && listing.name.trim() ? listing.name : undefined;
        const merchantUrl = typeof listing.merchantUrl === "string" && listing.merchantUrl.startsWith("https://") ? listing.merchantUrl : undefined;
        if (!id || !label || !merchantUrl) return [];
        const amount = typeof listing.observedPrice?.amount === "number" ? listing.observedPrice.amount : undefined;
        const currency = typeof listing.observedPrice?.currency === "string" ? listing.observedPrice.currency : "USD";
        const videoUrl = typeof listing.videoUrl === "string" && listing.videoUrl.startsWith("https://") ? listing.videoUrl : undefined;
        const rating = typeof listing.rating === "number" && listing.rating >= 0 && listing.rating <= 5 ? listing.rating : undefined;
        const reviewCount = typeof listing.reviewCount === "number" && Number.isInteger(listing.reviewCount) && listing.reviewCount >= 0 ? listing.reviewCount : undefined;
        return [{
          id: index,
          label,
          price: formatObservedPrice(amount, currency),
          source: typeof listing.brand === "string" ? listing.brand : "Spresso discovery",
          thumbnail: typeof listing.imageUrl === "string" ? listing.imageUrl : undefined,
          category: typeof listing.category === "string" ? listing.category : "general",
          description: typeof listing.reviewSummary === "string" ? listing.reviewSummary : "Found by Spresso visual search.",
          catalogMatched: true,
          productId: id,
          merchantUrl,
          availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
          sku: typeof listing.providerListingId === "string" ? listing.providerListingId : id,
          currency,
          observedPriceAmount: amount,
          rating,
          reviewCount,
          reviewSummary: typeof listing.reviewSummary === "string" ? listing.reviewSummary : undefined,
          videoUrl,
          listing,
          virtualTryOnEligible: true,
        }];
      });
      setDetectedRegions(regions);
      setSelectedRegionId(0);
      if (regions.length === 0) throw new Error("Visual search returned no usable merchant listings.");
      setIsScanning(false);
    } catch (error: any) {
      Logger.error("Lens search failed", error);
      setErrorMessage(error.message || "Visual analysis is currently unavailable.");
      setIsScanning(false);
    }
  };

  if (!isOpen) return null;

  const currentItem = detectedRegions[selectedRegionId];
  const toCatalogProduct = (region: LensRegion) => {
    if (!region.catalogMatched || !region.productId || !region.source || !region.category || !region.thumbnail || !region.sku || !region.merchantUrl || !region.listing || region.observedPriceAmount == null || region.observedPriceAmount <= 0) return null;
    return {
      id: region.productId,
      name: region.label,
      brand: region.source,
      price: region.observedPriceAmount,
      currency: region.currency || "USD",
      category: region.category,
      description: region.description || "",
      image: region.thumbnail,
      availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
      sku: region.sku,
      rating: region.rating,
      virtualTryOnEligible: region.virtualTryOnEligible === true,
      merchantUrl: region.merchantUrl,
      listing: region.listing,
      genMediaKit: region.videoUrl ? { videoUrl: region.videoUrl } : undefined,
      reviewCount: region.reviewCount,
      reviewSummary: region.reviewSummary,
    };
  };

  return createPortal(

    <div id="google-lens-modal-container" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-200">
      <div className="relative w-full h-full max-w-7xl bg-[#0d1311] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 z-10 shrink-0 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <MaterialIcon icon="lens_camera" size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tight">Spresso Lens</h2>
              <p className="text-stone-400 text-xs font-medium">Visual Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              onClick={captureCurrentAppScreen}
              disabled={isCapturingScreen}
              className="w-10 h-10 rounded-full bg-orange-500/80 hover:bg-orange-500 disabled:opacity-50 text-white flex items-center justify-center transition cursor-pointer"
              title="Capture screen"
            >
              <MaterialIcon icon="screen_search_desktop" size={20} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Upload Image"
            >
              <MaterialIcon icon="upload_file" size={20} />
            </button>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <MaterialIcon icon="close" size={22} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-6 relative custom-scrollbar">
          {errorMessage ? (
            <div className="mt-8">
              <ErrorStateFallback 
                message={errorMessage} 
                onRetry={() => {
                  setErrorMessage(null);
                  setScreenSnapshot(null);
                  setDetectedRegions([]);
                }} 
              />
            </div>
          ) : (
            <>
              {/* Visual Category Filters */}
              <GoogleLensCategoryTabs
                activeTab={activeCategoryTab}
                onTabChange={(tab: string) => setActiveCategoryTab(tab as any)}
                categories={[
                  { id: "all", label: "All Visual Results", icon: "grid_view" },
                  ...Array.from(new Set(detectedRegions.filter(r => r.category).map(r => r.category))).map(cat => ({
                    id: cat!,
                    label: cat!,
                    icon: cat?.toLowerCase().includes("gourmet") || cat?.toLowerCase().includes("food") ? "restaurant" : "shopping_bag"
                  }))
                ]}
              />

              {/* Middle Hero Section */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-6 items-center z-20">
                
                {/* Left Hero Content */}
                <div className="md:col-span-6 space-y-4 text-left">
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.15] font-headline">
                    Where <span className="text-orange-500 underline decoration-orange-500/40 decoration-wavy">taste</span><br />
                    meets perfection
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-200 font-sans leading-relaxed max-w-md">
                    {currentItem?.description || "Capture your screen or upload an image to find matching merchant listings."}
                  </p>

                  {currentItem && (
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      {toCatalogProduct(currentItem) ? (
                        <button
                          onClick={() => onAddToCart?.(toCatalogProduct(currentItem))}
                          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-full transition shadow-xl shadow-orange-500/30 cursor-pointer flex items-center space-x-2 transform hover:scale-105"
                        >
                          <span>Add to cart {currentItem.price ? `• ${currentItem.price}` : ""}</span>
                          <MaterialIcon icon="add_shopping_cart" size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => onSearchComplete?.(currentItem.label, screenSnapshot || "")}
                          className="px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs rounded-full transition cursor-pointer flex items-center space-x-2 backdrop-blur-md shadow-md"
                        >
                          <MaterialIcon icon="search" size={16} className="text-amber-400" />
                          <span>Search the catalog</span>
                        </button>
                      )}

                      {currentItem.isLocation && (
                        <button
                          onClick={() => setShowLocationDetails(true)}
                          className="px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs rounded-full transition cursor-pointer flex items-center space-x-2 backdrop-blur-md shadow-md"
                        >
                          <MaterialIcon icon="reviews" size={16} className="text-amber-400" />
                          <span>Location reviews</span>
                        </button>
                      )}
                    </div>
                  )}
                  {currentItem && (currentItem.videoUrl || currentItem.rating != null || currentItem.reviewSummary) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-stone-300" aria-label="Listing details">
                      {currentItem.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <MaterialIcon icon="star" size={14} className="text-amber-400" />
                          {currentItem.rating.toFixed(1)}{currentItem.reviewCount != null ? ` (${currentItem.reviewCount.toLocaleString()} reviews)` : ""}
                        </span>
                      )}
                      {currentItem.reviewSummary && <span className="max-w-md line-clamp-2">{currentItem.reviewSummary}</span>}
                      {currentItem.videoUrl && (
                        <a href={currentItem.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200">
                          <MaterialIcon icon="play_circle" size={14} />
                          Watch video
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Interactive Screen Capture Auto-Detection Overlay */}
                <div className="md:col-span-6 flex items-center justify-center relative my-4 sm:my-0">
                  <div
                    className="relative w-full max-w-[340px] flex items-center justify-center border border-white/20 bg-stone-900 rounded-3xl overflow-hidden shadow-2xl"
                  >
                    {screenSnapshot ? (
                      <div className="relative w-full" style={{ aspectRatio: `${window.innerWidth}/${window.innerHeight}` }}>
                        <img
                          src={screenSnapshot}
                          alt="Captured App Screen"
                          className="w-full h-full object-cover pointer-events-none"
                        />
                        
                        {/* Quiet overlay while the selected item is analyzed. */}
                        {isScanning && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-50">
                            <MaterialIcon icon="search" size={32} className="text-orange-400" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-[340px] flex flex-col items-center justify-center text-stone-400 space-y-2">
                        <MaterialIcon icon="image" size={36} />
                        <span className="text-xs">Capturing screen layout...</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom Section: Scrollable Bottom Navigation of Matched Products */}
              <div className="pt-5 border-t border-white/10 space-y-4 z-20 w-full">
                <div className="flex items-center justify-between text-left">
                  <h3 className="text-sm font-extrabold text-white tracking-wide font-headline">
                    Product Listings & Matches
                  </h3>
                  <span className="text-xs text-orange-400 font-mono font-semibold">
                    {detectedRegions.length > 0 ? `${detectedRegions.length} listings` : ""}
                  </span>
                </div>

                {detectedRegions.length > 0 ? (
                  <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    {detectedRegions.map((region, idx) => (
                      <div
                        key={region.id}
                        onClick={() => setSelectedRegionId(idx)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center space-x-3 text-left min-w-[280px] max-w-[320px] shrink-0 ${
                          selectedRegionId === idx
                            ? "bg-white/20 border-white/40 shadow-xl"
                            : "bg-white/10 hover:bg-white/15 border-white/15 text-white"
                        }`}
                      >
                        <div className="w-1.5 h-14 rounded-full bg-emerald-500 shrink-0" />
                        
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-black shrink-0 border-2 border-white shadow-md">
                          <img src={region.thumbnail} alt={region.label} className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="text-xs font-bold text-white truncate">{region.label}</h4>
                          <p className="text-[10px] text-stone-300 font-semibold truncate">{region.price || "Price not available"}</p>
                          <p className="text-[9px] text-stone-400 truncate">{region.source}</p>
                          
                          <div className="flex items-center space-x-2 pt-1">
                            {toCatalogProduct(region) ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCart?.(toCatalogProduct(region));
                                  }}
                                  className="text-amber-300 hover:text-amber-200 font-semibold text-[10px] transition"
                                >
                                  Add to cart
                                </button>
                                {region.virtualTryOnEligible && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTryOn?.(toCatalogProduct(region));
                                      onClose();
                                    }}
                                    className="text-white hover:text-stone-200 font-semibold text-[10px] transition"
                                  >
                                    Try on
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSearchComplete?.(region.label, screenSnapshot || "");
                                }}
                                className="text-amber-300 hover:text-amber-200 font-semibold text-[10px] transition"
                              >
                                Search catalog
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isScanning && (
                    <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 mt-6">
                      <MaterialIcon icon="broken_image" size={32} className="text-white/30 mb-2" />
                      <p className="text-sm font-bold text-white/50">Capture a screen or upload an image to find products.</p>
                    </div>
                  )
                )}
              </div>

              {/* Headless Chat Section for Direct Communication */}
              {currentItem && (
                <div className="mt-4 pt-4 border-t border-white/10 z-20 w-full">
                  <AIShopperInputBar
                    onSend={(text) => {
                      if (onSearchComplete && screenSnapshot) {
                        onSearchComplete(
                          `Inquiry regarding "${currentItem.label}" (cost: ${currentItem.price}): "${text}"`,
                          screenSnapshot
                        );
                      }
                      onClose();
                    }}
                    placeholder={`Ask Spresso about "${currentItem.label}"...`}
                    sticky={false}
                    className="px-0 bg-transparent border-0 ring-0 shadow-none"
                  />
                </div>
              )}
            </>
          )}

          {/* Location Details & Reviews Modal Overlay */}
          {showLocationDetails && currentItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
              <div className="w-full max-w-lg my-auto">
                <LocationDetailsView
                  data={{
                    title: currentItem.label || "Spresso Identified Location",
                    subtitle: currentItem.source || "Spresso Lens result",
                    heroImage: currentItem.thumbnail || "",
                    distanceInfo: "",
                    sectionTitle: "Location Details",
                    sectionMeta: currentItem.price || "",
                    categories: ["Identified"],
                    reviewsCountText: "",
                    items: []
                  }}
                  onClose={() => setShowLocationDetails(false)}
                  onSelectReviewItem={(item) => {
                    onSearchComplete?.(`${item.title} near ${currentItem.label}`, item.image || screenSnapshot || "");
                    setShowLocationDetails(false);
                    onClose();
                  }}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
