import React, { useState } from "react";
import { authFetch } from "../lib/firebase";
import { DetectedItem, HITLPayload, ProductItem } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { CameraObjectDetectionModal } from "./CameraObjectDetectionModal";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { cropImageSnippet } from "../utils/imageCropper";

interface SmartVisionViewProps {
  deviceMode?: string;
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  products: ProductItem[];
  onAskAI?: (text: string, image?: string | null) => void;
}


export const SmartVisionView: React.FC<SmartVisionViewProps> = ({
  onSelectTryOn,
  onRequestHITLCheckout,
  products,
  onAskAI
}) => {
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [detectedResult, setDetectedResult] = useState<{
    detectedItems: DetectedItem[];
    hudAnnotationText: string;
  } | null>(null);
  const [itemThumbnails, setItemThumbnails] = useState<Record<number, string>>({});

  const activeImage = customImage || (products.length > 0 ? products[0].image : "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomImage(reader.result as string);
        triggerVisionIdentify(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerVisionIdentify = async (imgDataUrl?: string) => {
    setIsScanning(true);
    setItemThumbnails({});
    const targetImage = imgDataUrl || activeImage;

    try {
      const res = await authFetch("/api/vision/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: targetImage,
          deviceContext: "WEB",
          promptText: "Identify product and match catalog stock."
        })
      });

      const data = await res.json();
      if (data.success && data.result) {
        setDetectedResult(data.result);

        const items: DetectedItem[] = data.result.detectedItems || [];
        const crops: Record<number, string> = {};
        for (let i = 0; i < items.length; i++) {
          const crop = await cropImageSnippet(targetImage, items[i].boundingBox);
          crops[i] = crop;
        }
        setItemThumbnails(crops);
      }
    } catch (err) {
      // Ignored
    } finally {
      setIsScanning(false);
    }
  };

  const handleTriggerHITL = (item: DetectedItem, thumbnail?: string) => {
    const prod = products.find(p => p.id === item.matchingCatalogId) || products[0];
    const finalPrice = item.priceEstimate && item.priceEstimate > 0 ? item.priceEstimate : (prod?.price || 0);
    const finalImage = thumbnail || prod?.image || activeImage;

    const payload: HITLPayload = {
      authorizationId: `ORDER-${Date.now().toString(36).toUpperCase()}`,
      product: {
        id: prod?.id || `prod-detected-${Date.now()}`,
        name: item.detectedName || prod?.name || "",
        price: finalPrice,
        sku: prod?.sku || `VIS-${Date.now()}`,
        image: finalImage
      },
      quantity: 1,
      totalAmount: finalPrice,
      currency: "USD",
      deviceSource: "WEB",
      inventoryConfirmed: true,
      stockRemaining: prod?.stock ?? 0,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Confirm purchase of ${item.detectedName} for $${finalPrice.toFixed(2)}?`,
        safetyChecks: [
          "In stock and reserved",
          "Includes free express delivery",
          "Click confirm to place order"
        ]
      }
    };

    onRequestHITLCheckout(payload);
  };

  return (
    <div className="flex flex-col h-full w-full bg-black relative">
      {/* Floating Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-2">
          <MaterialIcon icon="photo_camera" size={24} className="text-white drop-shadow-md" />
          <h2 className="text-xl font-bold text-white drop-shadow-md font-headline">Smart Vision</h2>
        </div>
        <div className="flex items-center space-x-3 pointer-events-auto">
          <button
            onClick={() => setLiveCameraOpen(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-xl transition cursor-pointer flex items-center space-x-2"
            title="Use Live Camera"
          >
            <MaterialIcon icon="photo_camera" size={20} />
            <span className="hidden sm:inline">Live Camera</span>
          </button>
          <label className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-xl transition cursor-pointer flex items-center">
            <MaterialIcon icon="upload" size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => triggerVisionIdentify()}
            disabled={isScanning}
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl transition flex items-center cursor-pointer disabled:opacity-50"
            title="Rescan"
          >
            <MaterialIcon icon="refresh" size={20} className={isScanning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center">
        <img
          src={activeImage}
          alt="Camera Stream"
            className={`w-full h-full object-cover transition duration-500 ${isScanning ? "brightness-50 blur-[1px]" : "brightness-95"}`}
          />

          {isScanning && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
              <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin flex items-center justify-center">
                <MaterialIcon icon="auto_awesome" size={20} className="text-white animate-pulse" />
              </div>
              <p className="mt-3 text-xs font-medium">Scanning frame...</p>
            </div>
          )}

          {!isScanning &&
            detectedResult?.detectedItems.map((item, idx) => {
              const matchedCatalogItem = products.find(p => p.id === item.matchingCatalogId);

              return (
                <div
                  key={idx}
                  className="absolute z-20 transition-all duration-300"
                  style={{
                    top: `${(item.boundingBox[0] / 1000) * 100}%`,
                    left: `${(item.boundingBox[1] / 1000) * 100}%`,
                    width: `${((item.boundingBox[3] - item.boundingBox[1]) / 1000) * 100}%`,
                    height: `${((item.boundingBox[2] - item.boundingBox[0]) / 1000) * 100}%`
                  }}
                >
                  <div className="w-full h-full border-2 border-[#386633] bg-[#386633]/10 rounded-xl relative shadow-lg">
                    {matchedCatalogItem && matchedCatalogItem.rating && (
                      <span className="absolute -top-3 -left-1 px-2 py-0.5 bg-[#386633] text-white text-[10px] font-extrabold rounded-md shadow-md flex items-center space-x-1">
                        <MaterialIcon icon="star" size={12} className="text-amber-300" />
                        <span>{matchedCatalogItem.rating.toFixed(1)}</span>
                      </span>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-[#d8ebd7] text-[#18211e] shadow-xl text-left pointer-events-auto">
                      <div className="flex items-center gap-2">
                        {itemThumbnails[idx] && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#386633] shadow-xs bg-black shrink-0">
                            <img src={itemThumbnails[idx]} alt="Mini Snippet" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-[#5e635f] uppercase tracking-wider block truncate">
                            {item.brandGuess} · {item.category}
                          </span>
                          <h4 className="text-xs font-bold text-[#18211e] truncate">
                            {item.detectedName}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-sm font-extrabold text-[#386633]">
                              ${(item.priceEstimate && item.priceEstimate > 0 ? item.priceEstimate : (matchedCatalogItem?.price || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {matchedCatalogItem && matchedCatalogItem.virtualTryOnEligible && (
                            <button
                              onClick={() => onSelectTryOn(matchedCatalogItem)}
                              className="p-2 bg-[#f2f8f2] hover:bg-[#e8f3e8] text-[#386633] rounded-lg border border-[#b0d4af] transition cursor-pointer"
                              title="Try On"
                            >
                              <MaterialIcon icon="styler" size={16} />
                            </button>
                          )}

                          <button
                            onClick={() => handleTriggerHITL(item, itemThumbnails[idx])}
                            className="p-2 bg-[#386633] hover:bg-[#2c5227] text-white rounded-lg shadow-xs transition cursor-pointer"
                            title="Buy"
                          >
                            <MaterialIcon icon="shopping_bag" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

      <div className="absolute bottom-6 left-0 right-0 z-40 pointer-events-none px-4">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <AIShopperInputBar
            onSend={(t, img) => onAskAI?.(t, img)}
            onSelectTryOn={onSelectTryOn}
            placeholder="Ask AI about object detection & vision search..."
          />
        </div>
      </div>
    </div>
  );
};
