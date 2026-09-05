import React, { useState } from "react";
import { MaterialIcon } from "./MaterialIcon";

export interface LocationItem {
  id: string;
  title: string;
  category: string;
  priceLevel: string; // e.g., "$$" or "$$$"
  distance: string; // e.g., "1.2 miles away"
  rating: number; // 1-5
  image: string;
  snippet: string; // e.g., "Authentic homemade pasta with truffle cream..."
  isFavorite?: boolean;
}

export interface LocationData {
  id?: string;
  title: string;
  subtitle?: string;
  heroImage: string;
  itineraryAdded?: boolean;
  distanceInfo?: string; // e.g. "12 mins from hotel"
  sectionTitle?: string; // e.g. "Section title"
  sectionMeta?: string; // e.g. "Within 5 miles • $$-$$$"
  categories?: string[];
  reviewsCountText?: string; // e.g. "View 231 restaurants"
  items: LocationItem[];
}

interface LocationDetailsViewProps {
  data: LocationData;
  onClose?: () => void;
  onAddToItinerary?: (data: LocationData) => void;
  onSelectReviewItem?: (item: LocationItem) => void;
  className?: string;
}

export const LocationDetailsView: React.FC<LocationDetailsViewProps> = ({
  data,
  onClose,
  onAddToItinerary,
  onSelectReviewItem,
  className = ""
}) => {
  const [isItineraryAdded, setIsItineraryAdded] = useState(!!data.itineraryAdded);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    data.categories && data.categories.length > 0 ? data.categories[0] : ""
  );
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  const categories = data.categories || [];

  const toggleFavorite = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleItineraryToggle = () => {
    const nextState = !isItineraryAdded;
    setIsItineraryAdded(nextState);
    if (onAddToItinerary) {
      onAddToItinerary({ ...data, itineraryAdded: nextState });
    }
  };

  const displayedItems = showAllItems ? data.items : data.items.slice(0, 3);

  return (
    <div className={`w-full max-w-md mx-auto bg-[var(--md-sys-color-surface,#ffffff)] text-[var(--md-sys-color-on-surface,#1c1b1f)] rounded-[28px] overflow-hidden shadow-2xl border border-[var(--md-sys-color-outline-variant,rgba(0,0,0,0.1))] font-sans relative ${className}`}>
      {/* 1. Hero Header Banner */}
      <div className="relative w-full h-64 sm:h-72 bg-neutral-900 overflow-hidden">
        <img
          src={data.heroImage || ""}
          alt={data.title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />

        {/* Top Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

        {/* Back / Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/25 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 active:scale-95 transition cursor-pointer border border-white/20 z-10"
            aria-label="Back"
          >
            <MaterialIcon icon="arrow_back" size={20} />
          </button>
        )}

        {/* Abstract Decorative Header Geometry Matching Wireframe */}
        <div className="absolute top-6 right-6 opacity-30 pointer-events-none flex space-x-2">
          <div className="w-12 h-12 bg-white/40 rounded-t-full rounded-br-2xl blur-[1px]" />
          <div className="w-10 h-10 bg-white/30 rounded-2xl rotate-12 blur-[1px]" />
        </div>

        {/* Header Content Overlay (Title, Subtitle & Action Chips) */}
        <div className="absolute bottom-4 left-4 right-4 text-white z-10 flex flex-col space-y-2.5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm font-serif">
              {data.title}
            </h2>
            {data.subtitle && (
              <p className="text-xs sm:text-sm text-white/80 font-medium tracking-wide drop-shadow-xs">
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Location actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleItineraryToggle}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer backdrop-blur-md shadow-xs ${
                isItineraryAdded
                  ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] border border-white/30"
                  : "bg-white/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-white hover:bg-white border border-white/40"
              }`}
            >
              <MaterialIcon icon={isItineraryAdded ? "event_available" : "calendar_add_on"} size={16} />
              <span>{isItineraryAdded ? "In my itinerary" : "Add to my itinerary"}</span>
            </button>

            {data.distanceInfo && (
              <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-white flex items-center space-x-1.5 backdrop-blur-md border border-white/40 shadow-xs">
                <MaterialIcon icon="directions_walk" size={16} />
                <span>{data.distanceInfo}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Section Title & Sub-header */}
      <div className="p-5 sm:p-6 space-y-4">
        <div className="text-center sm:text-left space-y-0.5">
          {data.sectionTitle && (
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--md-sys-color-on-surface,#1c1b1f)]">
              {data.sectionTitle}
            </h3>
          )}
          {data.sectionMeta && (
            <p className="text-xs text-[var(--md-sys-color-outline,#79747e)] font-medium">
              {data.sectionMeta}
            </p>
          )}
        </div>

        {/* 3. Category Filter Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  isSelected
                    ? "bg-[var(--md-sys-color-secondary-container,#4a6267)] text-[var(--md-sys-color-on-secondary-container,#ffffff)] font-bold shadow-xs"
                    : "bg-[var(--md-sys-color-surface-container-high,#f0f4f0)] dark:bg-neutral-800 text-[var(--md-sys-color-on-surface-variant,#444746)] hover:bg-[var(--md-sys-color-surface-container-highest,#e2e8e2)]"
                }`}
              >
                {isSelected && <MaterialIcon icon="check" size={14} />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Review / Location Item Cards */}
        <div className="space-y-3 pt-1">
          {displayedItems.map((item) => {
            const isFav = !!favorites[item.id];
            return (
              <div
                key={item.id}
                onClick={() => onSelectReviewItem && onSelectReviewItem(item)}
                className="p-3 sm:p-3.5 rounded-2xl bg-[var(--md-sys-color-surface-container-lowest)] border border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)] transition shadow-2xs hover:shadow-md cursor-pointer flex items-start space-x-3.5 group"
              >
                {/* Thumbnail Image with Rounded Organic Corner */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
                  <img
                    src={item.image || ""}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1 left-1 bg-black/50 backdrop-blur-xs text-white p-1 rounded-lg">
                    <MaterialIcon icon="place" size={10} />
                  </div>
                </div>

                {/* Info & Rating */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm sm:text-base font-bold text-[var(--md-sys-color-on-surface)] truncate group-hover:text-[var(--md-sys-color-primary)] transition">
                      {item.title}
                    </h4>

                    {/* Star Rating & Heart Icon */}
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      <div className="flex items-center text-amber-500 text-xs">
                        {[...Array(5)].map((_, i) => (
                          <MaterialIcon
                            key={i}
                            icon={i < Math.floor(item.rating) ? "star" : "star_outline"}
                            size={14}
                          />
                        ))}
                      </div>

                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className={`p-1 rounded-full transition cursor-pointer ${
                          isFav ? "text-rose-500" : "text-neutral-400 hover:text-neutral-600"
                        }`}
                        aria-label="Bookmark item"
                      >
                        <MaterialIcon icon={isFav ? "favorite" : "favorite_border"} size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Category & Meta info line */}
                  <p className="text-[11px] sm:text-xs text-[var(--md-sys-color-outline,#79747e)] font-medium truncate">
                    {[item.category, item.priceLevel, item.distance].filter(Boolean).join(" • ")}
                  </p>

                  {/* Supporting Review Snippet Line */}
                  <p className="text-[11.5px] sm:text-xs text-[var(--md-sys-color-on-surface-variant,#444746)] line-clamp-2 leading-relaxed">
                    "{item.snippet}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 5. Bottom Action Button */}
        <div className="pt-2">
          <button
            onClick={() => setShowAllItems(prev => !prev)}
            className="w-full py-3 px-4 rounded-full border border-[var(--md-sys-color-outline)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] font-bold text-xs sm:text-sm tracking-wide transition cursor-pointer flex items-center justify-center space-x-2 active:scale-[0.99]"
          >
            <span>{showAllItems ? "Show Less Highlights" : (data.reviewsCountText || `View all ${data.items.length} reviews & spots`)}</span>
            <MaterialIcon icon={showAllItems ? "expand_less" : "arrow_forward"} size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
