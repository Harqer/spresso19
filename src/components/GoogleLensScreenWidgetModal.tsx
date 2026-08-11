import React, { useState, useEffect, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { cropImageSnippet } from "../utils/imageCropper";
import { ElevatedQuickActionFab } from "./ElevatedQuickActionFab";
import { LocationDetailsView } from "./LocationDetailsView";
import { AIShopperInputBar } from "./AIShopperInputBar";
import html2canvas from "html2canvas";

interface GoogleLensScreenWidgetModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSearchComplete?: (queryText: string, imageBase64: string) => void;
  onSelectTryOn?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  initialProduct?: any;
}

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
  const [activeCategoryTab, setActiveCategoryTab] = useState<"all" | "gourmet" | "shopping" | "web">("all");
  const [detectedRegions, setDetectedRegions] = useState<Array<{ id: number; label: string; price?: string; source?: string; thumbnail?: string; category?: string; description?: string; isLocation?: boolean }>>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number>(0);
  const [showLocationDetails, setShowLocationDetails] = useState<boolean>(false);
  
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

      // Fallback clean snapshot
      const fallbackCanvas = document.createElement("canvas");
      fallbackCanvas.width = 1080;
      fallbackCanvas.height = 1920;
      const ctx = fallbackCanvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        grad.addColorStop(0, "#18211e");
        grad.addColorStop(1, "#0d1311");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
        const dataUrl = fallbackCanvas.toDataURL("image/jpeg", 0.9);
        setScreenSnapshot(dataUrl);
        runGoogleLensScreenAnalysis(dataUrl);
      }
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
      const response = await fetch("/api/lens-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const detected = data?.detectedResult?.detectedItems || [];
      const apifyItems = data?.apifyResults || [];

      const regions: any[] = [];
      let idCounter = 0;

      // Add Gemini detections first
      detected.forEach((item: any) => {
        regions.push({
          id: idCounter++,
          label: item.detectedName || "Identified Item",
          price: item.priceEstimate ? `$${item.priceEstimate.toFixed(2)}` : "",
          source: item.brandGuess || "Spresso Lens Match",
          thumbnail: imageBase64,
          category: item.category || "",
          description: item.buyActionPrompt || "Visual match detected by Gemini."
        });
      });

      // Add Apify Lens matching items next
      apifyItems.forEach((item: any) => {
        regions.push({
          id: idCounter++,
          label: item.title || "Web Match Product",
          price: item.price || "",
          source: item.source || "Google Lens Web Result",
          thumbnail: item.imageUrl || imageBase64,
          category: "Shopping",
          description: `Visual match from ${item.source || "web"}.`
        });
      });

      setDetectedRegions(regions);
      setSelectedRegionId(0);
    } catch (err) {
      console.error("Lens search API error:", err);
      setDetectedRegions([]);
      setSelectedRegionId(0);
    } finally {
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

  return (
    <div
      id="google-lens-modal-container"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in select-none"
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleScreenshotUpload}
      />

      {/* Background Ambient Blur Image */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {(screenSnapshot || currentItem?.thumbnail) && (
          <img
            src={screenSnapshot || currentItem?.thumbnail}
            alt="Ambient Background"
            className="w-full h-full object-cover filter blur-3xl scale-125"
          />
        )}
      </div>

      {/* Main Glassmorphic Card Container */}
      <div className="relative w-full max-w-5xl bg-[#1d2924]/65 backdrop-blur-3xl border border-white/20 rounded-[36px] p-6 sm:p-10 text-white shadow-[0_35px_90px_-15px_rgba(0,0,0,0.85)] flex flex-col justify-between overflow-hidden min-h-[620px] z-10 my-auto">

        {/* Top Navigation & Brand Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 z-20">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <MaterialIcon icon="restaurant" size={20} className="text-stone-950" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-black tracking-tight font-headline text-white">Spresso</span>
              <span className="text-[10px] font-mono bg-orange-500/20 text-orange-300 px-2.5 py-0.5 rounded-full border border-orange-500/30 uppercase tracking-wider font-bold">
                Google Lens Active
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8 text-xs font-semibold text-stone-200">
            <button
              onClick={() => setActiveCategoryTab("all")}
              className={`hover:text-amber-400 transition cursor-pointer ${activeCategoryTab === "all" ? "text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5" : ""}`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveCategoryTab("gourmet")}
              className={`hover:text-amber-400 transition cursor-pointer ${activeCategoryTab === "gourmet" ? "text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5" : ""}`}
            >
              Tables
            </button>
            <button
              onClick={() => setActiveCategoryTab("shopping")}
              className={`hover:text-amber-400 transition cursor-pointer ${activeCategoryTab === "shopping" ? "text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5" : ""}`}
            >
              Hi-Tea
            </button>
            <button
              onClick={() => setActiveCategoryTab("web")}
              className={`hover:text-amber-400 transition cursor-pointer ${activeCategoryTab === "web" ? "text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5" : ""}`}
            >
              Reservations
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-block text-xs font-extrabold text-emerald-400 hover:text-emerald-300 transition cursor-pointer">
              Be a member
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer border border-white/10"
              title="Upload Screenshot or Photo"
            >
              <MaterialIcon icon="file_upload" size={18} />
            </button>
            <button
              onClick={captureCurrentAppScreen}
              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-extrabold rounded-full transition cursor-pointer shadow-md shadow-orange-500/20 flex items-center space-x-1"
              title="Rescan Screen"
            >
              <MaterialIcon icon="center_focus_strong" size={15} />
              <span className="hidden sm:inline">Rescan</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-full transition cursor-pointer hover:bg-white/10"
              title="Close"
            >
              <MaterialIcon icon="close" size={20} />
            </button>
          </div>
        </div>

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
                        brand: currentItem.source || "Google Lens Match",
                        price: currentItem.price ? (parseFloat(currentItem.price.replace(/[^0-9.]/g, "")) || 0) : 0,
                        currency: "USD",
                        category: currentItem.category || "Shopping",
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

          {/* Floating UI Elements */}
          {currentItem && (
            <div className="hidden lg:block absolute left-8 top-1/4 max-w-[200px] z-30 space-y-4">
              <div className="bg-black/60 backdrop-blur-xl border border-white/20 p-4 rounded-3xl shadow-2xl">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <MaterialIcon icon="local_mall" size={14} className="text-white" />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Identified</span>
                </div>
                <h3 className="font-bold text-white text-lg leading-tight mb-1">{currentItem.label}</h3>
                <p className="text-stone-300 text-xs font-mono">{currentItem.price}</p>
              </div>
            </div>
          )}

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
                              brand: region.source || "Google Lens Match",
                              price: region.price ? (parseFloat(region.price.replace(/[^0-9.]/g, "")) || 0) : 0,
                              currency: "USD",
                              category: region.category || "Shopping",
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
                              brand: region.source || "Google Lens Match",
                              price: region.price ? (parseFloat(region.price.replace(/[^0-9.]/g, "")) || 0) : 0,
                              currency: "USD",
                              category: region.category || "Shopping",
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

        {/* Headless Chat Section for Direct Shopper Communication */}
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
              placeholder={`Ask Spresso AI about "${currentItem.label}"...`}
              sticky={false}
              className="px-0 bg-transparent border-0 ring-0 shadow-none"
            />
          </div>
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
                      price: parseFloat(item.priceLevel?.replace(/[^0-9.]/g, "") || "0"),
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
  );
};
