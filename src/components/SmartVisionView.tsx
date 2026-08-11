import React, { useState } from "react";
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

const PRESET_CAMERA_FEEDS = [
  {
    id: "feed-1",
    label: "Smart Eyewear & Wearables",
    image: "",
    catalogMatchId: "prod-rayban-meta-01"
  },
  {
    id: "feed-2",
    label: "Tech Apparel & Outerwear",
    image: "",
    catalogMatchId: "prod-cyber-jacket-02"
  },
  {
    id: "feed-3",
    label: "Footwear & Runners",
    image: "",
    catalogMatchId: "prod-neo-runner-03"
  },
  {
    id: "feed-4",
    label: "Audio & Headphones",
    image: "",
    catalogMatchId: "prod-synth-headphones-05"
  }
];

export const SmartVisionView: React.FC<SmartVisionViewProps> = ({
  onSelectTryOn,
  onRequestHITLCheckout,
  products,
  onAskAI
}) => {
  const [selectedFeed, setSelectedFeed] = useState(PRESET_CAMERA_FEEDS[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [detectedResult, setDetectedResult] = useState<{
    detectedItems: DetectedItem[];
    hudAnnotationText: string;
  } | null>(null);
  const [itemThumbnails, setItemThumbnails] = useState<Record<number, string>>({});

  const activeImage = customImage || selectedFeed.image || (products.find(p => p.id === selectedFeed.catalogMatchId)?.image || "");

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
      const res = await fetch("/api/vision/identify", {
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-surface p-5 rounded-3xl border border-outline-variant shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <MaterialIcon icon="photo_camera" size={22} className="text-primary" />
            <h2 className="text-lg font-bold text-on-surface font-headline">Visual Camera Search</h2>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Point camera or upload image to perform visual product identification and instant checkout.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setLiveCameraOpen(true)}
            className="px-3.5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1.5 text-xs"
            title="Use Live Camera"
          >
            <MaterialIcon icon="photo_camera" size={18} />
            <span>Open Live Camera</span>
          </button>

          <label className="p-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-xl border border-outline transition cursor-pointer flex items-center" title="Upload Image File">
            <MaterialIcon icon="upload" size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          <button
            onClick={() => triggerVisionIdentify()}
            disabled={isScanning}
            className="p-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl border border-outline transition flex items-center cursor-pointer disabled:opacity-50"
            title="Rescan Frame"
          >
            <MaterialIcon icon="refresh" size={18} className={isScanning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Preset Feeds */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRESET_CAMERA_FEEDS.map(feed => (
          <button
            key={feed.id}
            onClick={() => {
              setCustomImage(null);
              setSelectedFeed(feed);
              triggerVisionIdentify(feed.image);
            }}
            className={`p-2 rounded-2xl border text-left transition flex items-center space-x-2 cursor-pointer ${
              selectedFeed.id === feed.id && !customImage
                ? "bg-white border-[#386633] shadow-xs"
                : "bg-white/60 border-[#d8ebd7] hover:bg-white"
            }`}
          >
            <img src={feed.image || products.find(p => p.id === feed.catalogMatchId)?.image || ""} alt="" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-[11px] font-bold text-[#18211e] truncate">{feed.label}</span>
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="relative mx-auto max-w-4xl bg-black rounded-3xl overflow-hidden border border-[#e2e2e2] shadow-sm">
        <div className="relative aspect-video sm:aspect-[16/9] w-full overflow-hidden flex items-center justify-center">
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
                    <span className="absolute -top-3 -left-1 px-2 py-0.5 bg-[#386633] text-white text-[10px] font-extrabold rounded-md shadow-md">
                      {(item.confidenceScore * 100).toFixed(0)}% MATCH
                    </span>

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

        <div className="p-4 bg-white border-t border-[#e2e2e2] flex items-center justify-between text-xs text-[#18211e]">
          <span className="font-medium text-xs">{detectedResult?.hudAnnotationText}</span>
        </div>
      </div>

      <CameraObjectDetectionModal
        isOpen={liveCameraOpen}
        onClose={() => setLiveCameraOpen(false)}
        onSelectTryOn={onSelectTryOn}
        onSelectProductListing={(newProduct) => {
          setCustomImage(newProduct.image);
          triggerVisionIdentify(newProduct.image);
        }}
      />

      {/* Global AI Communication Input Bar */}
      <AIShopperInputBar
        onSend={(t, img) => onAskAI?.(t, img)}
        onSelectTryOn={onSelectTryOn}
        placeholder="Ask AI Shopper about object detection & vision search..."
        className="mt-6"
      />
    </div>
  );
};
