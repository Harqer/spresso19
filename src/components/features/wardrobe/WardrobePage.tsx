import Logger from "../../../lib/Logger";
import React, { useState, useEffect } from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorStateFallback, EmptyStateFallback } from "../../shared/Fallbacks";
import { SeasonalStylingResponseSchema } from "../../../lib/schema";
import { WardrobeStylingEngineSection } from "./ai_styling/WardrobeStylingEngineSection";
import { WardrobeGallerySection } from "./gallery/WardrobeGallerySection";


interface WardrobePhoto {
  id: string;
  title: string;
  category: string;
  photoUrl: string;
}

interface WardrobePageProps {
  onOpenTryOn: (product: ProductItem | null) => void;
  onOpenLens: () => void;
  userLocation?: string | null;
  userLatLng?: { lat: number; lng: number } | null;
}

export const WardrobePage: React.FC<WardrobePageProps> = ({ onOpenTryOn, onOpenLens, userLocation, userLatLng }) => {
  const [photos, setPhotos] = useState<WardrobePhoto[]>([]);

  const [activeSeason, setActiveSeason] = useState<string>("Winter");

  const queryClient = useQueryClient();

  const { data: curatedFits = [], isLoading: stylingLoading, isError: stylingError } = useQuery({
    queryKey: ["seasonalFits", activeSeason, userLocation],
    queryFn: async () => {
      const weatherMap: Record<string, string> = {
        Winter: "Winter Season (Cold 32°F / Snow)",
        Summer: "Hot Summer Resort (88°F Sunny)",
        Occasion: "Special Occasion Formal Evening"
      };

      const { functions } = await import("../../../lib/firebase");
      const { httpsCallable } = await import("firebase/functions");
      const seasonalStyling = httpsCallable(functions, "seasonalStyling");

      const res = await seasonalStyling({
        weatherCondition: weatherMap[activeSeason] || "",
        season: activeSeason,
        occasion: activeSeason === "Occasion" ? "Special Occasion Wear" : "Casual High-Fashion",
        userLocation: userLocation,
        userLatLng: userLatLng
      });
      const parsedData = SeasonalStylingResponseSchema.parse(res.data);
      if (parsedData?.result?.curatedFits) {
        return parsedData.result.curatedFits;
      }
      return [];
    }
  });

  const handleAddPhoto = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
          const rawDataUrl = event.target?.result as string;
          if (rawDataUrl) {
            try {
              const { addWardrobeItem } = await import("@firebasegen/spresso-connector");
              await addWardrobeItem({
                category: "TOP", // Default to TOP for now, could add UI to select
                brand: "Unknown",
                imageUrl: rawDataUrl
              });
              
              setPhotos((prev) => [
                {
                  id: `local-${Date.now()}`,
                  title: file.name.replace(/\.[^/.]+$/, ""),
                  category: "TOP",
                  photoUrl: rawDataUrl
                },
                ...prev
              ]);
            } catch (err: any) {
              Logger.error("Failed to add wardrobe item via API:", err);
            }
          }
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } catch (err: any) {
      Logger.error("Failed to trigger photo add:", err);
    }
  };
  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#191d16] p-5 rounded-2xl border border-[#dfe4d7] dark:border-[#43483e] shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#191d16] dark:text-[#e1e4d9] flex items-center space-x-2">
            <MaterialIcon icon="checkroom" size={24} className="text-[#446732] dark:text-[#a9d291]" />
            <span>My Wardrobe & Photo Gallery</span>
          </h1>
          <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1">
            Deep styling intelligence, weather-tailored fits, and virtual try-on integrations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenLens}
            className="px-3.5 py-2 bg-[#e8efe0] dark:bg-[#282b24] hover:bg-[#dfe4d7] text-[#446732] dark:text-[#a9d291] font-bold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer border border-[#dfe4d7] dark:border-[#43483e]"
          >
            <MaterialIcon icon="center_focus_weak" size={16} />
            <span>Screen Lens</span>
          </button>

          <button
            onClick={handleAddPhoto}
            className="px-4 py-2 bg-[#446732] hover:bg-[#385428] text-white font-extrabold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-md cursor-pointer"
          >
            <MaterialIcon icon="add" size={18} />
            <span>Add Look</span>
          </button>
        </div>
      </div>

      <WardrobeStylingEngineSection
        activeSeason={activeSeason}
        setActiveSeason={setActiveSeason}
        stylingLoading={stylingLoading}
        stylingError={stylingError}
        curatedFits={curatedFits}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["seasonalFits", activeSeason, userLocation] })}
      />

      <WardrobeGallerySection
        photos={photos}
        handleAddPhoto={handleAddPhoto}
        onOpenTryOn={onOpenTryOn}
      />
    </div>
  );
};
