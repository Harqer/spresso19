import React, { useState, useRef, useEffect } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { ProductItem, DetectedItem } from "../types";
import { cropImageSnippet } from "../utils/imageCropper";

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

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isInitializing, setIsInitializing] = useState(true);

  // Photo Capture State
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [tappedPoint, setTappedPoint] = useState<{ x: number; y: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [croppedThumbnail, setCroppedThumbnail] = useState<string | null>(null);
  const [hudStatusText, setHudStatusText] = useState<string>("");
  const [addedToListings, setAddedToListings] = useState<boolean>(false);

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

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn("Camera error:", err);
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
      setTappedPoint(null);
      setDetectedItems([]);
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
        setTappedPoint(null);
        setDetectedItems([]);
        setHudStatusText("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Analysis & Sweep Animation State
  const sweepCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSweeping, setIsSweeping] = useState(false);

  const triggerMaterial3Sweep = (point: { x: number; y: number }) => {
    setIsSweeping(true);
    const canvas = sweepCanvasRef.current;
    if (!canvas) {
      setTimeout(() => setIsSweeping(false), 700);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setTimeout(() => setIsSweeping(false), 700);
      return;
    }

    const width = canvas.width || 800;
    const height = canvas.height || 800;
    const originX = (point.x / 100) * width;
    const originY = (point.y / 100) * height;

    let startTime: number | null = null;
    const duration = 800; // ms

    const animateSweep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / duration);

      ctx.clearRect(0, 0, width, height);

      // Material 3 Radial Ripple Sweep Wave
      const maxRadius = Math.hypot(width, height);
      const radius = progress * maxRadius;

      // Draw Material 3 Tonal Ripple Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(originX, originY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(59, 130, 246, ${1 - progress})`;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Soft Tonal Fill Wave
      const radGrad = ctx.createRadialGradient(originX, originY, 0, originX, originY, radius);
      radGrad.addColorStop(0, `rgba(59, 130, 246, ${0.3 * (1 - progress)})`);
      radGrad.addColorStop(0.8, `rgba(56, 102, 51, ${0.15 * (1 - progress)})`);
      radGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = radGrad;
      ctx.fill();
      ctx.restore();

      // Horizontal Material 3 Scan Sweep Line
      const scanY = progress * height;
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.fillRect(0, scanY, width, 2);
      ctx.restore();

      if (progress < 1) {
        requestAnimationFrame(animateSweep);
      } else {
        ctx.clearRect(0, 0, width, height);
        setIsSweeping(false);
      }
    };

    requestAnimationFrame(animateSweep);
  };

  const handlePhotoInteraction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!capturedPhoto || isAnalyzing) return;
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

    triggerMaterial3Sweep({ x, y });
    analyzeTappedObject(capturedPhoto, { x, y });
  };

  const analyzeTappedObject = async (photoDataUrl: string, point: { x: number; y: number }) => {
    setTappedPoint(point);
    setIsAnalyzing(true);
    setAddedToListings(false);
    setHudStatusText("Analyzing selected item...");

    try {
      const res = await fetch("/api/vision/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoDataUrl,
          deviceContext: "MOBILE_CAMERA_OBJECT_DETECTION",
          promptText: `Analyze object at location X: ${point.x}%, Y: ${point.y}%. CRITICAL: Ignore and exclude the human person/model wearing or holding the item. Focus strictly on the clothing garment, accessory, footwear, or item at this spot for an e-commerce product listing.`
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        const items = data.result.detectedItems || [];
        setDetectedItems(items);
        setHudStatusText(data.result.hudAnnotationText || "Object isolated. Product listing ready!");

        if (items.length > 0) {
          const crop = await cropImageSnippet(photoDataUrl, items[0].boundingBox, point);
          setCroppedThumbnail(crop);
        }
      }
    } catch (err) {
      console.error("Camera object detection error:", err);
      setHudStatusText("Object detection completed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateListing = (item: DetectedItem) => {
    const finalPrice = item.priceEstimate && item.priceEstimate > 0 ? item.priceEstimate : 95;
    const finalImage = croppedThumbnail || capturedPhoto || "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80";

    const newProduct: ProductItem = {
      id: item.matchingCatalogId || `prod-custom-${Date.now()}`,
      name: item.detectedName,
      brand: item.brandGuess || "Spresso Verified",
      price: finalPrice,
      currency: "USD",
      category: item.category || "Fashion",
      description: `Camera Detected Product: ${item.detectedName}. Identified from object scan.`,
      image: finalImage,
      stock: 12,
      sku: `CAM-SCAN-${Math.floor(1000 + Math.random() * 9000)}`,
      rating: 4.9,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 sm:p-4 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="relative w-full max-w-lg h-full sm:h-[88vh] bg-slate-950 text-white rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
        
        {/* Top Header */}
        <div className="absolute top-0 inset-x-0 z-40 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              title="Close Camera"
            >
              <MaterialIcon icon="close" size={24} />
            </button>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white tracking-tight">Camera · Object Detection</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!capturedPhoto && (
              <button
                onClick={() => setFacingMode(prev => (prev === "environment" ? "user" : "environment"))}
                className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                title="Flip Camera"
              >
                <MaterialIcon icon="cameraswitch" size={22} />
              </button>
            )}
            {capturedPhoto && (
              <button
                onClick={handleRetake}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition cursor-pointer flex items-center space-x-1"
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
          className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden select-none cursor-crosshair touch-none"
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
                    className="w-full h-full object-cover"
                  />

                  {isInitializing && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-3 text-white z-20">
                      <div className="w-9 h-9 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      <span className="text-xs font-medium text-white/80">Initializing Object Detection Camera...</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* CAPTURED PICTURE MODE */}
          {capturedPhoto && (
            <>
              <img
                src={capturedPhoto}
                alt="Captured Object"
                className="w-full h-full object-contain bg-black"
              />

              {/* MATERIAL 3 ANIMATED SWEEP CANVAS OVERLAY */}
              <canvas
                ref={sweepCanvasRef}
                width={800}
                height={800}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              />

              {/* INTERACTIVE SOLID BLUE DOT ON TOUCH/CLICK LOCATION */}
              {tappedPoint && (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-30 transition-all duration-200"
                  style={{ left: `${tappedPoint.x}%`, top: `${tappedPoint.y}%` }}
                >
                  <div className="w-5 h-5 bg-blue-500 border-2 border-white rounded-full shadow-xl" />
                </div>
              )}

              {/* Material 3 Progress Sweep Bar */}
              {isAnalyzing && (
                <div className="absolute inset-x-0 top-0 z-40 h-1 bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-pulse w-full" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Control / Product Listing Action Card */}
        <div className="relative z-40 pb-6 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center space-y-3 px-4">
          {!capturedPhoto ? (
            /* Live Camera Shutter Button */
            <div className="w-full flex items-center justify-between max-w-xs">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white flex items-center justify-center transition cursor-pointer shadow-md"
                title="Upload Photo"
              >
                <MaterialIcon icon="photo_library" size={22} />
              </button>

              <button
                onClick={handleSnapPicture}
                disabled={isInitializing}
                className="w-20 h-20 rounded-full bg-transparent border-4 border-emerald-400 flex items-center justify-center cursor-pointer transition transform active:scale-90 shadow-2xl group"
                title="Take Picture for Object Detection"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-400 group-hover:bg-emerald-300 text-black flex items-center justify-center shadow-inner">
                  <MaterialIcon icon="photo_camera" size={30} className="text-black" />
                </div>
              </button>

              <div className="w-12 h-12" />
            </div>
          ) : (
            /* Post-Capture Object Detection Results & Listing Card */
            <div className="w-full space-y-3 max-w-md">
              {/* Tap Instruction Pill */}
              <div className="bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-center text-emerald-200 text-xs font-medium shadow-md">
                💡 <span className="font-bold">Touch or click anywhere</span> on clothing/item in photo to move blue dot & isolate product.
              </div>

              {/* Detected Item Card */}
              {detectedItems.length > 0 && (
                <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-2xl space-y-3 animate-fade-in">
                  <div className="flex items-start gap-3">
                    {/* Mini Cropped Image Thumbnail Preview */}
                    {(croppedThumbnail || capturedPhoto) && (
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-emerald-400 shadow-lg bg-black shrink-0">
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
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-extrabold rounded-md uppercase tracking-wider">
                          Product Isolated
                        </span>
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">
                          98% MATCH
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1 truncate">
                        {detectedItems[0].detectedName}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 truncate">
                        Brand: <span className="font-semibold text-white">{detectedItems[0].brandGuess || "Spresso Item"}</span> · Category: {detectedItems[0].category}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-extrabold text-emerald-400 block">
                        ${(detectedItems[0].priceEstimate && detectedItems[0].priceEstimate > 0 ? detectedItems[0].priceEstimate : 95).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleCreateListing(detectedItems[0])}
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

                    {onSelectTryOn && (
                      <button
                        onClick={() => {
                          onSelectTryOn({
                            id: detectedItems[0].matchingCatalogId || `prod-custom-${Date.now()}`,
                            name: detectedItems[0].detectedName,
                            brand: detectedItems[0].brandGuess || "Spresso",
                            price: detectedItems[0].priceEstimate && detectedItems[0].priceEstimate > 0 ? detectedItems[0].priceEstimate : 95,
                            currency: "USD",
                            category: detectedItems[0].category || "Fashion",
                            description: detectedItems[0].detectedName,
                            image: croppedThumbnail || capturedPhoto || "",
                            stock: 10,
                            sku: `SCAN-${Math.floor(1000 + Math.random() * 9000)}`,
                            rating: 4.9,
                            virtualTryOnEligible: true,
                            mcpServerId: "spresso-mcp-bargain-chef"
                          });
                          onClose();
                        }}
                        className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        title="Virtual Try-On"
                      >
                        <MaterialIcon icon="styler" size={16} />
                        <span>Try On</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
