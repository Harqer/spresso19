import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem, DetectedItem } from "../types";
import { cropImageSnippet } from "../utils/imageCropper";
import { logToCrashlytics, functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";

interface CameraObjectDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProductListing?: (product: ProductItem) => void;
  onSelectTryOn?: (product: ProductItem) => void;
}

export const CameraObjectDetectionModal: React.FC<CameraObjectDetectionModalProps> = ({
  isOpen,
  onClose,
  onSelectProductListing,
  onSelectTryOn,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isInitializing, setIsInitializing] = useState(true);

  // Photo Capture State
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [tappedPoint, setTappedPoint] = useState<{ x: number; y: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [croppedThumbnail, setCroppedThumbnail] = useState<string | null>(null);
  const [hudStatusText, setHudStatusText] = useState<string>("");
  const [addedToListings, setAddedToListings] = useState<boolean>(false);

  // CameraX-style Pro Features State
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("auto");
  const [showGrid, setShowGrid] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [exposureVal, setExposureVal] = useState(0);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedPhoto]);

  const startCamera = async (mode: "environment" | "user") => {
    setIsInitializing(true);
    setCameraError(null);
    stopCamera();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      logToCrashlytics("warn", "Camera error", { error: String(err) });
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. You can upload a photo from your gallery.");
      } else {
        setCameraError("Camera unavailable. Please upload a photo.");
      }
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSnapPicture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      stopCamera();
      setCapturedPhoto(dataUrl);

      // Do NOT auto-select or auto-analyze point. Wait for user tap on photo.
      setTappedPoint(null);
      setDetectedItems([]);
      setCroppedThumbnail(null);
      setHudStatusText("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        stopCamera();
        const dataUrl = reader.result as string;
        setCapturedPhoto(dataUrl);

        // Do NOT auto-select or auto-analyze point. Wait for user tap on photo.
        setTappedPoint(null);
        setDetectedItems([]);
        setCroppedThumbnail(null);
        setHudStatusText("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const x = Math.round(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)));
    const y = Math.round(Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100)));

    const point = { x, y };
    setTappedPoint(point);

    if (capturedPhoto) {
      analyzeTappedObject(capturedPhoto, point);
    }
  };

  const handleSelectItem = async (index: number) => {
    setSelectedIndex(index);
    if (detectedItems[index] && capturedPhoto) {
      const item = detectedItems[index];
      if (item.boundingBox) {
        const [ymin, xmin, ymax, xmax] = item.boundingBox;
        const centerX = Math.round((xmin + xmax) / 20);
        const centerY = Math.round((ymin + ymax) / 20);
        const point = { x: centerX, y: centerY };
        setTappedPoint(point);
        const crop = await cropImageSnippet(capturedPhoto, item.boundingBox, point);
        setCroppedThumbnail(crop);
      }
    }
  };

  const analyzeTappedObject = async (photoDataUrl: string, point: { x: number; y: number }) => {
    setTappedPoint(point);
    setIsAnalyzing(true);
    setAddedToListings(false);
    setSelectedIndex(0);
    setHudStatusText("Analyzing item at selected location...");

    try {
      const identifyVisionObject = httpsCallable(functions, "identifyVisionObject");
      const res = await identifyVisionObject({
        imageBase64: photoDataUrl,
        deviceContext: "MOBILE_CAMERA_OBJECT_DETECTION",
        promptText: `Analyze object at location X: ${point.x}%, Y: ${point.y}%. CRITICAL: Ignore any person or human model in background. Identify the exact clothing item, footwear, accessory, or object at this specific location for an e-commerce product listing.`
      });

      const data = { success: true, result: { detectedItems: [res.data as any], hudAnnotationText: "Object isolated. Product listing ready!" } };
      if (data.success && data.result) {
        const items = data.result.detectedItems || [];
        setDetectedItems(items);
        setHudStatusText(data.result.hudAnnotationText || "Object isolated. Product listing ready!");

        if (items.length > 0) {
          const crop = await cropImageSnippet(photoDataUrl, items[0].boundingBox, point).catch(() => null);
          setCroppedThumbnail(crop);
        }
      } else {
        throw new Error("Failed to parse vision response");
      }
    } catch (err) {
      logToCrashlytics("error", "Camera object detection error", { error: String(err) });
      setHudStatusText("Object detection failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateListing = (item: DetectedItem) => {
    const finalPrice = item.priceEstimate || null;
    const finalImage = croppedThumbnail || capturedPhoto || "";

    const newProduct: any = {
      id: item.matchingCatalogId || `prod-custom-${Date.now()}`,
      name: item.detectedName,
      brand: item.brandGuess || "",
      price: finalPrice,
      currency: "USD",
      category: item.category || "",
      description: `Camera Detected Product: ${item.detectedName}. Identified from object scan.`,
      image: finalImage,
      stock: null,
      sku: (item as any).sku || `SKU-SCAN-${Date.now()}`,
      rating: null,
      virtualTryOnEligible: true,
      mcpServerId: "spresso-mcp-bargain-chef"
    };

    setAddedToListings(true);
    if (onSelectProductListing) {
      onSelectProductListing(newProduct);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setTappedPoint(null);
    setDetectedItems([]);
    setCroppedThumbnail(null);
    setHudStatusText("");
    setAddedToListings(false);
    startCamera(facingMode);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black animate-fade-in flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="relative w-full h-full flex flex-col justify-between text-white overflow-hidden">
        
        {/* Top Header - Minimal Clean Camera Header */}
        <div className="absolute top-0 inset-x-0 z-40 p-3.5 bg-black/30 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition cursor-pointer backdrop-blur-md"
              title="Close Camera"
            >
              <MaterialIcon icon="close" size={22} />
            </button>
            <div className="flex items-center space-x-2">
            </div>
          </div>

          {/* Pro Camera Top Controls */}
          {!capturedPhoto && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setFlashMode(prev => prev === "auto" ? "on" : prev === "on" ? "off" : "auto")}
                className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition cursor-pointer"
                title={`Flash: ${flashMode}`}
              >
                <MaterialIcon icon={flashMode === "auto" ? "flash_auto" : flashMode === "on" ? "flash_on" : "flash_off"} size={20} />
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded-full transition cursor-pointer ${showGrid ? 'text-amber-400 bg-white/10' : 'text-white/90 hover:text-white hover:bg-white/15'}`}
                title="Rule of Thirds Grid"
              >
                <MaterialIcon icon={showGrid ? "grid_on" : "grid_off"} size={20} />
              </button>
              <button
                onClick={() => setFacingMode(prev => (prev === "environment" ? "user" : "environment"))}
                className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-full transition cursor-pointer"
                title="Flip Camera"
              >
                <MaterialIcon icon="cameraswitch" size={20} />
              </button>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {capturedPhoto && (
              <button
                onClick={handleRetake}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-full transition cursor-pointer flex items-center space-x-1"
              >
                <MaterialIcon icon="refresh" size={16} />
                <span>Retake</span>
              </button>
            )}
          </div>
        </div>

        {/* Viewport Area */}
        <div
          onClick={handlePhotoInteraction}
          onTouchStart={handlePhotoInteraction}
          className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none cursor-pointer touch-none"
        >
          {/* CAMERA FEED MODE */}
          {!capturedPhoto && (
            <>
              {cameraError ? (
                <div className="p-6 text-center max-w-sm space-y-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto border border-white/20">
                    <MaterialIcon icon="videocam_off" size={28} />
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-white text-black text-xs font-bold rounded-full transition cursor-pointer shadow-md inline-flex items-center space-x-2"
                  >
                    <MaterialIcon icon="upload" size={18} />
                    <span>Upload Photo</span>
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transition-transform duration-300"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />

                  {/* Rule of Thirds Grid */}
                  {showGrid && (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                      <div className="border-b border-r border-white/30"></div>
                      <div className="border-b border-r border-white/30"></div>
                      <div className="border-b border-white/30"></div>
                      <div className="border-b border-r border-white/30"></div>
                      <div className="border-b border-r border-white/30"></div>
                      <div className="border-b border-white/30"></div>
                      <div className="border-r border-white/30"></div>
                      <div className="border-r border-white/30"></div>
                      <div></div>
                    </div>
                  )}

                  {/* Manual Focus Ring / Tap point indicator */}
                  {tappedPoint && !isInitializing && (
                    <div 
                      className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-400 pointer-events-none animate-ping-once"
                      style={{ left: `${tappedPoint.x}%`, top: `${tappedPoint.y}%` }}
                    />
                  )}

                  {/* ORGANIC LIQUID GLASS MORPH LENS IN LIVE CAMERA */}
                  {tappedPoint && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 transition-all duration-500 ease-out"
                      style={{ left: `${tappedPoint.x}%`, top: `${tappedPoint.y}%` }}
                    >
                      <div className="relative w-20 h-18 backdrop-blur-2xl bg-white/25 border-2 border-white/90 shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-liquid-morph overflow-hidden">
                        <div className="absolute top-1 left-2 w-8 h-3 bg-gradient-to-r from-white/90 to-transparent rounded-full blur-[0.5px] rotate-[-25deg]" />
                        <div className="absolute bottom-2 right-3 w-6 h-2 bg-white/60 rounded-full blur-[1px]" />
                      </div>
                    </div>
                  )}


                </>
              )}
            </>
          )}

          {/* CAPTURED PICTURE MODE */}
          {capturedPhoto && (
            <div
              onClick={handlePhotoInteraction}
              onTouchStart={handlePhotoInteraction}
              className="relative w-full h-full cursor-pointer overflow-hidden select-none"
            >
              <img
                src={capturedPhoto}
                alt="Captured Object"
                className="w-full h-full object-cover bg-black"
              />

              {/* EXACT LIQUIDGLASS SVG DISPLACEMENT FILTER & GLASS COMPONENT */}
              {tappedPoint && (
                <div
                  className="liquidglass animate-liquid-entry -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${tappedPoint.x}%`, top: `${tappedPoint.y}%` }}
                >
                  <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="glass-filter-_r_b_" colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
                        <feImage
                          x="0"
                          y="0"
                          width="100%"
                          height="100%"
                          preserveAspectRatio="none"
                          result="map"
                          href="data:image/png;base64,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"
                        />
                        <feDisplacementMap in="SourceGraphic" in2="map" id="redchannel" result="dispRed" scale="-20" xChannelSelector="R" yChannelSelector="G" />
                        <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
                        <feDisplacementMap in="SourceGraphic" in2="map" id="greenchannel" result="dispGreen" scale="-24" xChannelSelector="R" yChannelSelector="G" />
                        <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
                        <feDisplacementMap in="SourceGraphic" in2="map" id="bluechannel" result="dispBlue" scale="-28" xChannelSelector="R" yChannelSelector="G" />
                        <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
                        <feBlend in="red" in2="green" mode="screen" result="rg" />
                        <feBlend in="rg" in2="blue" mode="screen" result="output" />
                        <feGaussianBlur in="output" stdDeviation="3" />
                      </filter>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Control / Product Listing Action Card - Cloudy Liquid Glass Bar */}
        <div className="relative z-40 pb-6 pt-4 bg-slate-950/80 backdrop-blur-2xl border-t border-white/15 flex flex-col items-center space-y-3 px-4">
          
          {!capturedPhoto && (
            <div className="w-full max-w-xs flex justify-center mb-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-black/50 backdrop-blur-md rounded-full p-1 border border-white/10">
                {[0.5, 1, 2, 3].map(z => (
                  <button 
                    key={z} 
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(z); }}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition cursor-pointer flex items-center justify-center ${zoomLevel === z ? 'bg-amber-400 text-black' : 'text-white hover:bg-white/20'}`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {!capturedPhoto ? (
            /* Live Camera Shutter Button */
            <div className="w-full flex items-center justify-between max-w-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white flex items-center justify-center transition cursor-pointer shadow-md backdrop-blur-md"
                title="Upload Photo"
              >
                <MaterialIcon icon="photo_library" size={22} />
              </button>

              <button
                onClick={handleSnapPicture}
                disabled={isInitializing}
                className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md border-4 border-amber-400 flex items-center justify-center cursor-pointer transition transform active:scale-90 shadow-2xl group"
                title="Capture Frame"
              >
                <div className="w-16 h-16 rounded-full bg-amber-400 group-hover:bg-amber-300 text-black flex items-center justify-center shadow-inner">
                  <MaterialIcon icon="camera" size={30} className="text-black" />
                </div>
              </button>

              {/* Empty placeholder to balance flex */}
              <div className="w-12 h-12" />
            </div>
          ) : (
            /* Post-Capture Object Detection Results & Listing Card */
            <div className="w-full space-y-3 max-w-md">
              {/* Tap Instruction Pill */}
              <div className="bg-emerald-950/60 backdrop-blur-md border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-center text-emerald-200 text-xs font-medium shadow-md flex items-center justify-center space-x-1.5">
                <MaterialIcon icon="lightbulb" size={14} className="text-emerald-400 shrink-0" />
                <span><span className="font-bold">Touch or click anywhere</span> on clothing/item in photo to isolate product.</span>
              </div>

              {/* Multiple Item Selector Tabs if more than 1 item */}
              {detectedItems.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {detectedItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectItem(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                        idx === selectedIndex
                          ? "bg-emerald-500 text-black shadow-md"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/15"
                      }`}
                    >
                      {item.detectedName}
                    </button>
                  ))}
                </div>
              )}

              {/* Detected Item Card */}
              {detectedItems.length > 0 && detectedItems[selectedIndex] && (
                <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-3xl border border-white/20 text-white shadow-2xl space-y-3 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="flex items-start gap-3">
                    {/* Mini Cropped Image Thumbnail Preview */}
                    {(croppedThumbnail || capturedPhoto) && (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-lg bg-black shrink-0">
                        <img
                          src={croppedThumbnail || capturedPhoto!}
                          alt="Isolated Item Snippet"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600/90 text-white text-[8px] font-extrabold text-center py-0.5 uppercase tracking-wider">
                          Snippet
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-blue-500/90 backdrop-blur-md text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider border border-blue-400/30">
                          Product Isolated
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1 truncate">
                        {detectedItems[selectedIndex].detectedName}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 truncate">
                        Brand: <span className="font-semibold text-white">{detectedItems[selectedIndex].brandGuess || "Spresso Item"}</span> · Category: {detectedItems[selectedIndex].category}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-emerald-400 block">
                        {detectedItems[selectedIndex].priceEstimate ? `$${detectedItems[selectedIndex].priceEstimate.toFixed(2)}` : null}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCreateListing(detectedItems[selectedIndex])}
                      disabled={addedToListings}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md ${
                        addedToListings
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-500 hover:bg-emerald-400 text-black"
                      }`}
                    >
                      <MaterialIcon icon={addedToListings ? "check_circle" : "add_shopping_cart"} size={16} />
                      <span>{addedToListings ? "Added to Spresso Products!" : "Generate Spresso Listing"}</span>
                    </button>

                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
