import React from "react";
import { MaterialIcon } from "./MaterialIcon";
import { CustomWardrobeItem } from "./WardrobeView";

export interface SeasonalCategorySectionProps {
  title: string;
  subtitle: string;
  seasonBadge: string;
  seasonTheme: "summer" | "winter" | "autumn" | "spring" | "resort";
  items: CustomWardrobeItem[];
  onItemClick?: (item: CustomWardrobeItem) => void;
  onToggleFavorite?: (item: CustomWardrobeItem) => void;
  onPrimaryAction?: (item: CustomWardrobeItem) => void;
  favoritedMap?: Record<string, boolean>;
}

export const SeasonalCategorySection: React.FC<SeasonalCategorySectionProps> = ({
  title,
  subtitle,
  seasonBadge,
  seasonTheme,
  items,
  onItemClick,
  onToggleFavorite,
  onPrimaryAction,
  favoritedMap = {}
}) => {
  // Theme badge colors
  const themeStyles = {
    summer: {
      bg: "bg-amber-50/70",
      border: "border-amber-200/80",
      badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
      accent: "text-amber-800",
      btnBg: "bg-amber-700 hover:bg-amber-800 text-white"
    },
    winter: {
      bg: "bg-sky-50/70",
      border: "border-sky-200/80",
      badgeBg: "bg-sky-100 text-sky-900 border-sky-300",
      accent: "text-sky-800",
      btnBg: "bg-sky-800 hover:bg-sky-900 text-white"
    },
    autumn: {
      bg: "bg-orange-50/70",
      border: "border-orange-200/80",
      badgeBg: "bg-orange-100 text-orange-900 border-orange-300",
      accent: "text-orange-800",
      btnBg: "bg-orange-800 hover:bg-orange-900 text-white"
    },
    spring: {
      bg: "bg-emerald-50/70",
      border: "border-emerald-200/80",
      badgeBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      accent: "text-emerald-800",
      btnBg: "bg-[#386633] hover:bg-[#2c5227] text-white"
    },
    resort: {
      bg: "bg-teal-50/70",
      border: "border-teal-200/80",
      badgeBg: "bg-teal-100 text-teal-900 border-teal-300",
      accent: "text-teal-800",
      btnBg: "bg-teal-700 hover:bg-teal-800 text-white"
    }
  }[seasonTheme];

  return (
    <div className={`p-5 sm:p-6 rounded-3xl border ${themeStyles.bg} ${themeStyles.border} shadow-xs space-y-4 transition-all duration-200`}>
      {/* Category Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base sm:text-lg font-bold text-[#18211e] font-headline">{title}</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border shadow-2xs ${themeStyles.badgeBg}`}>
              {seasonBadge}
            </span>
          </div>
          <p className="text-xs text-[#5e635f] mt-0.5">{subtitle}</p>
        </div>

        <span className="text-xs font-mono font-bold text-[#5e635f] shrink-0">
          {items.length} {items.length === 1 ? "Piece" : "Pieces"}
        </span>
      </div>

      {/* Item List / Cards Component - Clean World Peas List Layout */}
      {items.length === 0 ? (
        <div className="bg-white/80 p-8 rounded-2xl border border-black/5 text-center space-y-2">
          <MaterialIcon icon="checkroom" size={24} className="mx-auto text-neutral-400" />
          <p className="text-xs text-[#5e635f]">No clothing items in this collection yet. Snap photos or bookmark catalog picks!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map(item => {
            const isFav = favoritedMap[item.id] || false;

            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="bg-white border border-neutral-200/90 rounded-2xl p-3 flex items-center justify-between space-x-3 shadow-2xs hover:shadow-xs hover:border-[#386633] transition cursor-pointer group"
              >
                {/* Left Photo Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-neutral-100 flex items-center justify-center p-0.5 shrink-0 overflow-hidden relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition duration-300"
                  />
                  {item.type === "user_upload" && (
                    <span className="absolute bottom-1 left-1 bg-amber-500 text-white p-0.5 rounded-md text-[8px]" title="Camera Upload">
                      <MaterialIcon icon="photo_camera" size={10} />
                    </span>
                  )}
                </div>

                {/* Center Content Details */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center space-x-1">
                    <span className="text-[9px] font-mono font-bold text-[#386633] uppercase truncate">
                      {item.brand || item.category.replace("_", " ")}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 truncate leading-snug group-hover:text-[#386633] transition">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-semibold text-[#386633]">
                    {item.price ? `$${item.price.toFixed(2)}` : (item.color || "Personal Wardrobe")}
                  </p>
                </div>

                {/* Right Action Column */}
                <div className="flex flex-col items-end justify-between h-16 py-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite?.(item);
                    }}
                    className="text-neutral-400 hover:text-red-500 transition cursor-pointer p-1"
                    title={isFav ? "Remove Favorite" : "Favorite Item"}
                  >
                    <MaterialIcon
                      icon={isFav ? "favorite" : "favorite_border"}
                      size={18}
                      className={isFav ? "text-red-500" : "text-neutral-400"}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrimaryAction?.(item);
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-2xs cursor-pointer ${themeStyles.btnBg}`}
                    title="View & Try On"
                  >
                    <MaterialIcon icon="arrow_forward" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
