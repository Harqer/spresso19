import Logger from "../../../lib/Logger";
import React, { useState, useEffect } from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorStateFallback, EmptyStateFallback } from "../../shared/Fallbacks";
import { SeasonalStylingResponseSchema } from "../../../lib/schema";


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
  const [photos, setPhotos] = useState<WardrobePhoto[]>([
    {
      id: "w-1",
      title: "Winter Shearling Trench",
      category: "Winter Wear",
      photoUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"
    },
    {
      id: "w-2",
      title: "Silk Evening Cocktail Dress",
      category: "Special Occasion Wear",
      photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600"
    }
  ]);

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
    const categories = ["Winter Wear", "Hot Girl Summer", "Special Occasion Wear"];
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    const newPhoto: WardrobePhoto = {
      id: `w-${Date.now()}`,
      title: `Custom ${randomCat} Look`,
      category: randomCat,
      photoUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600"
    };

    setPhotos(prev => [newPhoto, ...prev]);

    // Async sync to server
    try {
      const { functions } = await import("../../../lib/firebase");
      const { httpsCallable } = await import("firebase/functions");
      const addWardrobePhoto = httpsCallable(functions, "addWardrobePhoto");
      await addWardrobePhoto(newPhoto);
    } catch (err) {
      Logger.warn("[Wardrobe] Photo upload sync error:", err);
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

      {/* Genkit Weather & Seasonal Styling Engine */}
      <div className="bg-[#e8efe0] dark:bg-[#1d2218] p-5 rounded-2xl border border-[#a9d291]/40 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#446732] dark:text-[#a9d291] uppercase tracking-wider">
              GENKIT AI STYLING ENGINE
            </span>
            <h2 className="text-sm font-extrabold text-[#191d16] dark:text-[#e1e4d9]">
              Weather-Tailored Outfit Curation
            </h2>
          </div>

          {/* Season Switcher Pills */}
          <div className="flex items-center space-x-2 bg-white dark:bg-[#191d16] p-1 rounded-xl border border-[#dfe4d7] dark:border-[#43483e]">
            {[
              { id: "Winter", label: "Winter Wear", icon: "ac_unit" },
              { id: "Summer", label: "Hot Summer", icon: "wb_sunny" },
              { id: "Occasion", label: "Special Occasion", icon: "auto_awesome" }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSeason(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                  activeSeason === s.id
                    ? "bg-[#446732] text-white shadow-xs"
                    : "text-[#43483e] dark:text-[#c3c8bb] hover:text-[#446732]"
                }`}
              >
                <MaterialIcon icon={s.icon} size={14} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {stylingLoading ? (
          <div className="flex items-center justify-center space-x-2 text-xs text-[#446732] font-semibold py-8">
            <MaterialIcon icon="hourglass_empty" size={16} className="animate-spin" />
            <span>Curating tailor-made fits for {activeSeason}...</span>
          </div>
        ) : stylingError ? (
          <ErrorStateFallback
            title="Styling Engine Unavailable"
            message="Spresso's AI styling engine could not be reached. Please check your connection."
            onRetry={() => queryClient.invalidateQueries({ queryKey: ["seasonalFits", activeSeason, userLocation] })}
          />
        ) : curatedFits.length === 0 ? (
          <EmptyStateFallback
            icon="auto_awesome"
            title="No Outfits Found"
            description={`We couldn't generate fits for ${activeSeason}.`}
            actionLabel="Try Another Season"
            onAction={() => setActiveSeason("Winter")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {curatedFits.map((fit, idx) => (
              <div key={idx} className="p-3.5 bg-white dark:bg-[#191d16] rounded-xl border border-[#dfe4d7] dark:border-[#43483e] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#191d16] dark:text-[#e1e4d9]">{fit.fitName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#e8efe0] dark:bg-[#282b24] text-[#446732] dark:text-[#a9d291]">
                    {fit.season || activeSeason}
                  </span>
                </div>
                <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">{fit.stylingNotes}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {fit.items?.map((item: string, i: number) => (
                    <span key={i} className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded font-mono">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wardrobe Photo Gallery Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-[#191d16] dark:text-[#e1e4d9] uppercase tracking-wider font-mono">
          Photo Gallery Looks ({photos.length})
        </h2>

        {photos.length === 0 ? (
          /* Empty State: Square Dashed Line Border Card with Plus Sign */
          <div
            onClick={handleAddPhoto}
            className="w-full h-48 border-2 border-dashed border-[#446732] dark:border-[#a9d291] rounded-2xl bg-[#f4f7f2] dark:bg-[#161a13] flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-[#e8efe0] transition"
          >
            <div className="w-12 h-12 rounded-xl bg-[#446732] text-white flex items-center justify-center shadow-md">
              <MaterialIcon icon="add" size={28} />
            </div>
            <span className="text-xs font-extrabold text-[#446732] dark:text-[#a9d291]">
              Tap Plus to Add Your First Wardrobe Photo
            </span>
          </div>
        ) : (
          /* Filled State Grid: Photo Cards + Persistent Plus Card */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {/* Square Dashed Line Border Plus Card */}
            <div
              onClick={handleAddPhoto}
              className="h-56 border-2 border-dashed border-[#446732] dark:border-[#a9d291] rounded-2xl bg-[#f4f7f2] dark:bg-[#161a13] flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-[#e8efe0] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#446732] text-white flex items-center justify-center shadow-xs">
                <MaterialIcon icon="add" size={24} />
              </div>
              <span className="text-[11px] font-bold text-[#446732] dark:text-[#a9d291]">Add Look</span>
            </div>

            {photos.map(p => (
              <div key={p.id} className="h-56 bg-white dark:bg-[#191d16] rounded-2xl border border-[#dfe4d7] dark:border-[#43483e] overflow-hidden flex flex-col justify-between group shadow-xs hover:shadow-md transition">
                <div className="relative w-full h-36 bg-stone-900 overflow-hidden">
                  <img src={p.photoUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded uppercase">
                    {p.category}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-xs font-bold truncate text-[#191d16] dark:text-[#e1e4d9]">{p.title}</span>
                  <button
                    onClick={() => onOpenTryOn(null)}
                    className="px-2.5 py-1 bg-[#e8efe0] dark:bg-[#282b24] hover:bg-[#446732] hover:text-white text-[#446732] dark:text-[#a9d291] font-bold text-[10px] rounded-lg transition flex items-center space-x-1 cursor-pointer"
                  >
                    <MaterialIcon icon="visibility" size={12} />
                    <span>Try On</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
