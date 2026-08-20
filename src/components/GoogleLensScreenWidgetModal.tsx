import Logger from "../lib/Logger";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon";
import { cropImageSnippet } from "../utils/imageCropper";
import { ElevatedQuickActionFab } from "./ElevatedQuickActionFab";
import { LocationDetailsView } from "./LocationDetailsView";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { ErrorStateFallback } from "./shared/Fallbacks";
import { GoogleLensBoundingBox } from "./features/vision/GoogleLensBoundingBox";
import { GoogleLensCategoryTabs } from "./features/vision/GoogleLensCategoryTabs";

import html2canvas from "html2canvas";

interface GoogleLensScreenWidgetModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSearchComplete?: (queryText: string, imageBase64: string) => void;
  onSelectTryOn?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  initialProduct?: any;
}

const parsePrice = (priceStr?: string) => {
  if (!priceStr) return 0;
  const cleanStr = priceStr.replace(/[^\d.,]/g, '');
  if (!cleanStr) return 0;
  if (cleanStr.includes(',') && cleanStr.includes('.')) {
    if (cleanStr.lastIndexOf(',') > cleanStr.lastIndexOf('.')) {
      return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleanStr.replace(/,/g, ''));
  }
  if (cleanStr.includes(',')) {
    const parts = cleanStr.split(',');
    if (parts[parts.length - 1].length === 2 || parts[parts.length - 1].length === 1) {
      return parseFloat(cleanStr.replace(',', '.'));
    }
    return parseFloat(cleanStr.replace(/,/g, ''));
  }
  return parseFloat(cleanStr) || 0;
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
  const [detectedRegions, setDetectedRegions] = useState<Array<{ id: number; label: string; price?: string; source?: string; thumbnail?: string; category?: string; description?: string; isLocation?: boolean }>>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number>(0);
  const [showLocationDetails, setShowLocationDetails] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Coordinate and gesture tracking states for draw selection
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [cropBox, setCropBox] = useState<{ ymin: number; xmin: number; ymax: number; xmax: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialProduct) {
        // If triggered directly by clicking an animated video or product image
        const initItem = {
          id: 0,
          label: initialProduct.name || "",
          price: initialProduct.price != null ? `$${initialProduct.price.toFixed(2)}` : "",
          source: initialProduct.brand || "",
          thumbnail: initialProduct.image || "",
          category: initialProduct.category || "",
          description: initialProduct.description || ""
        };
        setDetectedRegions([initItem]);
        setSelectedRegionId(0);
      } else {
        captureCurrentAppScreen();
      }
    } else {
      setScreenSnapshot(null);
      setDetectedRegions([]);
      setSelectedRegionId(0);
      setCropBox(null);
    }
  }, [isOpen, initialProduct]);

  const captureCurrentAppScreen = async () => {
    setIsCapturingScreen(true);
    try {
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "hidden";

      const canvasPromise = html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        ignoreElements: (element) => element.id === "google-lens-modal-container"
      });

      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      if (modalEl) modalEl.style.visibility = "visible";

      if (canvas) {
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setScreenSnapshot(dataUrl);
        runGoogleLensScreenAnalysis(dataUrl);
      } else {
        throw new Error("Screen capture timeout fallback");
      }
    } catch (err) {
      const modalEl = document.getElementById("google-lens-modal-container");
      if (modalEl) modalEl.style.visibility = "visible";

      setErrorMessage("Failed to capture screen content. Please try again.");
      Logger.error("Screen capture failed", err);
    } finally {
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
      const { functions } = await import("../lib/firebase");
      const { httpsCallable } = await import("firebase/functions");
      const lensSearch = httpsCallable(functions, "lensSearch");

      // We explicitly throw an error here because the backend API for lensSearch has not been implemented
      // on the new Cloud Functions architecture yet.
      throw new Error("Missing Backend API - Needs Implementation");
    } catch (error: any) {
      Logger.error("Lens search failed", error);
      setErrorMessage(error.message || "Visual analysis is currently unavailable.");
      setIsScanning(false);
    }
  };

  // Gesture handling functions (Click / Drag crop selection)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenSnapshot || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setIsDrawing(true);
    setCropBox(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCurrentPoint({ x, y });
  };

  const handleMouseUp = async () => {
    if (!isDrawing || !startPoint || !currentPoint || !imageContainerRef.current) return;
    setIsDrawing(false);

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x1 = Math.min(startPoint.x, currentPoint.x);
    const x2 = Math.max(startPoint.x, currentPoint.x);
    const y1 = Math.min(startPoint.y, currentPoint.y);
    const y2 = Math.max(startPoint.y, currentPoint.y);

    const width = x2 - x1;
    const height = y2 - y1;

    // Check if it's a simple tap/click
    if (width < 10 && height < 10) {
      const pctX = (startPoint.x / rect.width) * 100;
      const pctY = (startPoint.y / rect.height) * 100;
      setIsScanning(true);
      try {
        const cropped = await cropImageSnippet(screenSnapshot!, undefined, { x: pctX, y: pctY });
        await runGoogleLensScreenAnalysis(cropped);
      } catch (err) {
        setIsScanning(false);
      }
      return;
    }

    const ymin = Math.round((y1 / rect.height) * 1000);
    const xmin = Math.round((x1 / rect.width) * 1000);
    const ymax = Math.round((y2 / rect.height) * 1000);
    const xmax = Math.round((x2 / rect.width) * 1000);

    setCropBox({ ymin, xmin, ymax, xmax });

    setIsScanning(true);
    try {
      const cropped = await cropImageSnippet(screenSnapshot!, [ymin, xmin, ymax, xmax]);
      await runGoogleLensScreenAnalysis(cropped);
    } catch (err) {
      setIsScanning(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!screenSnapshot || !imageContainerRef.current || e.touches.length === 0) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    setStartPoint({ x, y });
    setCurrentPoint({ x, y });
    setIsDrawing(true);
    setCropBox(null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !imageContainerRef.current || e.touches.length === 0) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(touch.clientY - rect.top, rect.height));
    setCurrentPoint({ x, y });
  };

  const handleTouchEnd = async () => {
    if (!isDrawing || !startPoint || !currentPoint || !imageContainerRef.current) return;
    setIsDrawing(false);

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x1 = Math.min(startPoint.x, currentPoint.x);
    const x2 = Math.max(startPoint.x, currentPoint.x);
    const y1 = Math.min(startPoint.y, currentPoint.y);
    const y2 = Math.max(startPoint.y, currentPoint.y);

    const width = x2 - x1;
    const height = y2 - y1;

    if (width < 10 && height < 10) {
      const pctX = (startPoint.x / rect.width) * 100;
      const pctY = (startPoint.y / rect.height) * 100;
      setIsScanning(true);
      try {
        const cropped = await cropImageSnippet(screenSnapshot!, undefined, { x: pctX, y: pctY });
        await runGoogleLensScreenAnalysis(cropped);
      } catch (err) {
        setIsScanning(false);
      }
      return;
    }

    const ymin = Math.round((y1 / rect.height) * 1000);
    const xmin = Math.round((x1 / rect.width) * 1000);
    const ymax = Math.round((y2 / rect.height) * 1000);
    const xmax = Math.round((x2 / rect.width) * 1000);

    setCropBox({ ymin, xmin, ymax, xmax });

    setIsScanning(true);
    try {
      const cropped = await cropImageSnippet(screenSnapshot!, [ymin, xmin, ymax, xmax]);
      await runGoogleLensScreenAnalysis(cropped);
    } catch (err) {
      setIsScanning(false);
    }
  };

  const getBoxStyle = () => {
    if (!startPoint || !currentPoint) return {};
    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(startPoint.x - currentPoint.x);
    const height = Math.abs(startPoint.y - currentPoint.y);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  if (!isOpen) return null;

  const currentItem = detectedRegions[selectedRegionId];

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
                    {currentItem?.description || "Select an object by drawing or clicking on the screen capture to run Spresso Google Lens."}
                  </p>

                  {currentItem && (
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (onAddToCart) {
                            onAddToCart({
                              id: `lens-item-${currentItem.id}-${Date.now()}`,
                              name: currentItem.label,
                              brand: currentItem.source || "Unknown Brand",
                              price: parsePrice(currentItem.price),
                              currency: "USD",
                              category: currentItem.category || "General",
                              description: currentItem.description || `Identified via Google Lens: ${currentItem.label}`,
                              image: currentItem.thumbnail || "",
                              stock: 10,
                              sku: `LENS-BUY-${currentItem.id}`,
                              rating: 5.0,
                              virtualTryOnEligible: true,
                              mcpServerId: "spresso-retail"
                            });
                          }
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-full transition shadow-xl shadow-orange-500/30 cursor-pointer flex items-center space-x-2 transform hover:scale-105"
                      >
                        <span>Buy Now ({currentItem.price || "Contact"})</span>
                        <MaterialIcon icon="arrow_forward" size={16} />
                      </button>

                      <button
                        onClick={() => setShowLocationDetails(true)}
                        className="px-5 py-3 bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs uppercase tracking-wider rounded-full transition cursor-pointer flex items-center space-x-2 backdrop-blur-md shadow-md"
                      >
                        <MaterialIcon icon="reviews" size={16} className="text-amber-400" />
                        <span>Location Reviews</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Interactive Screen Capture Selection Container */}
                <div className="md:col-span-6 flex items-center justify-center relative my-4 sm:my-0">
                  <div
                    ref={imageContainerRef}
                    className="relative w-full max-w-[340px] h-[340px] rounded-3xl overflow-hidden border border-white/20 bg-stone-900 shadow-2xl cursor-crosshair select-none flex items-center justify-center"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {screenSnapshot ? (
                      <img
                        src={screenSnapshot}
                        alt="Captured App Screen"
                        className="w-full h-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 space-y-2">
                        <MaterialIcon icon="image" size={36} />
                        <span className="text-xs">Capturing screen layout...</span>
                      </div>
                    )}

                    {/* Pulsing scanning overlay if processing */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-30">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse absolute top-1/2 left-0 right-0 transform -translate-y-1/2" />
                        <MaterialIcon icon="auto_awesome" size={32} className="text-orange-400 animate-spin" />
                      </div>
                    )}

                    {/* Current Selection Box Overlay */}
                    {isDrawing && (
                      <div
                        className="absolute border-2 border-dashed border-orange-500 bg-orange-500/10 pointer-events-none z-25"
                        style={getBoxStyle()}
                      />
                    )}

                    <GoogleLensBoundingBox
                      cropBox={cropBox}
                      startPoint={startPoint}
                      currentPoint={currentPoint}
                      containerRect={imageContainerRef.current?.getBoundingClientRect()}
                      onChange={(newBox) => setCropBox(newBox)}
                      onResizeEnd={async (newBox) => {
                        setIsScanning(true);
                        try {
                          const cropped = await cropImageSnippet(screenSnapshot!, [newBox.ymin, newBox.xmin, newBox.ymax, newBox.xmax]);
                          await runGoogleLensScreenAnalysis(cropped);
                        } catch (err) {
                          setIsScanning(false);
                        }
                      }}
                    />
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
                    {detectedRegions.length} Options Identified
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
                          <p className="text-[10px] text-stone-300 font-semibold truncate">{region.price || "Contact Seller"}</p>
                          <p className="text-[9px] text-stone-400 truncate">{region.source}</p>
                          
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onAddToCart) {
                                  onAddToCart({
                                    id: `lens-item-${region.id}-${Date.now()}`,
                                    name: region.label,
                                    brand: region.source || "Unknown Brand",
                                    price: parsePrice(region.price),
                                    currency: "USD",
                                    category: region.category || "General",
                                    description: region.description || `Identified via Google Lens: ${region.label}`,
                                    image: region.thumbnail || "",
                                    stock: 10,
                                    sku: `LENS-CART-${region.id}`,
                                    rating: 5.0,
                                    virtualTryOnEligible: true,
                                    mcpServerId: "spresso-retail"
                                  });
                                }
                              }}
                              className="px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black text-[9px] rounded-full transition uppercase tracking-wider"
                            >
                              Buy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectTryOn) {
                                  onSelectTryOn({
                                    id: `lens-item-${region.id}-${Date.now()}`,
                                    name: region.label,
                                    brand: region.source || "Unknown Brand",
                                    price: parsePrice(region.price),
                                    currency: "USD",
                                    category: region.category || "General",
                                    description: region.description || `Identified via Google Lens: ${region.label}`,
                                    image: region.thumbnail || "",
                                    stock: 10,
                                    sku: `LENS-TRYON-${region.id}`,
                                    rating: 5.0,
                                    virtualTryOnEligible: true,
                                    mcpServerId: "spresso-retail"
                                  });
                                }
                                onClose();
                              }}
                              className="px-2.5 py-0.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-[9px] rounded-full transition uppercase tracking-wider"
                            >
                              Try-On
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isScanning && (
                    <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 mt-6">
                      <MaterialIcon icon="broken_image" size={32} className="text-white/30 mb-2" />
                      <p className="text-sm font-bold text-white/50">Draw over or click the screenshot above to identify items</p>
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
                    subtitle: `${currentItem.source || "Google Lens"} • Verified Match`,
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
                    if (onSelectTryOn) {
                      onSelectTryOn({
                        id: item.id || `loc-item-${Date.now()}`,
                        name: item.title,
                        brand: currentItem.label,
                        price: parsePrice(item.priceLevel),
                        currency: "USD",
                        category: item.category,
                        description: item.snippet,
                        image: item.image,
                        stock: 10,
                        sku: `SKU-LOC-${item.id || Date.now()}`,
                        rating: item.rating,
                        virtualTryOnEligible: true,
                        mcpServerId: "spresso-mcp-retail"
                      });
                    }
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
