import React, { useState } from "react";
import { motion } from "motion/react";
import { GeneratedOutfit } from "./WardrobeView";
import { CustomWardrobeItem } from "./WardrobeView";
import { MaterialIcon } from "./MaterialIcon";

interface ArcFanLayoutProps {
  outfits?: GeneratedOutfit[];
  singleItems?: CustomWardrobeItem[];
  onSelectOutfit?: (outfit: GeneratedOutfit) => void;
  onSelectItem?: (item: CustomWardrobeItem) => void;
  radius?: number; // in pixels
  cardWidth?: number; // in pixels
}

export const ArcFanLayout: React.FC<ArcFanLayoutProps> = ({
  outfits,
  singleItems,
  onSelectOutfit,
  onSelectItem,
  radius = 280,
  cardWidth = 180,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

  const cards = outfits || singleItems || [];
  const totalCards = cards.length;

  if (totalCards === 0) {
    return (
      <div className="p-8 text-center text-stone-400 text-xs">
        No outfits or items in this stack yet.
      </div>
    );
  }

  // Polar coordinate arc configuration matching Jetpack Compose ArcFanLayout
  // arcSize = 0.28 * 2 * Math.PI (fraction of a circle arc)
  // arcStart = 0.75 * 2 * Math.PI - arcSize / 2 (top center orientation)
  const arcSize = 0.28 * 2 * Math.PI;
  const arcStart = 0.75 * 2 * Math.PI - arcSize / 2;
  const arcStep = totalCards > 1 ? arcSize / (totalCards - 1) : 0;

  return (
    <div className="relative w-full overflow-hidden py-12 flex flex-col items-center justify-end min-h-[420px] select-none bg-gradient-to-b from-stone-900/40 via-stone-950/20 to-stone-900/40 rounded-3xl border border-[#d8ebd7]/30 shadow-inner">
      {/* Background Arc Helper Guide Ring */}
      <div
        className="absolute bottom-[-160px] rounded-full border border-dashed border-emerald-500/20 pointer-events-none"
        style={{
          width: radius * 2 + 100,
          height: radius * 2 + 100,
        }}
      />

      <div className="absolute top-4 left-6 flex items-center space-x-2 text-[var(--md-sys-color-on-surface)]">
        <span className="p-1 rounded-md bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]">
          <MaterialIcon icon="3d_rotation" size={16} />
        </span>
        <span className="text-xs font-mono font-bold tracking-wide">
          Interactive Arc Fan View ({totalCards} Cards)
        </span>
      </div>

      <div className="relative w-full max-w-4xl h-[320px] flex items-end justify-center">
        {cards.map((cardData, index) => {
          // Calculate distance shift based on distance from hovered card
          let shiftMultiplier = 0;
          if (hoveredIndex !== -1) {
            const diff = index - hoveredIndex;
            if (diff === 1) shiftMultiplier = 2.5;
            else if (diff === 2) shiftMultiplier = 1.8;
            else if (diff === 3) shiftMultiplier = 1.0;
            else if (diff === -1) shiftMultiplier = -2.5;
            else if (diff === -2) shiftMultiplier = -1.8;
            else if (diff === -3) shiftMultiplier = -1.0;
          }

          // Step along the arc with shift offset
          const shiftValue = shiftMultiplier * 0.035; // radians shift
          const currentAngle = arcStart + index * arcStep + shiftValue;

          // Polar coordinates mapping (Circle Equation)
          const xOffset = radius * Math.cos(currentAngle);
          const yOffset = radius * Math.sin(currentAngle) + radius - 40;

          // Tangent angle converted to rotation degrees + 90
          const rotationDegrees = (currentAngle * 180) / Math.PI + 90;

          // Z-index calculation prioritizing hovered card and center
          const isHovered = index === hoveredIndex;
          let zIndex = 10;
          if (isHovered) {
            zIndex = 50;
          } else if (hoveredIndex !== -1) {
            zIndex = 30 - Math.abs(index - hoveredIndex);
          } else {
            zIndex = totalCards - Math.abs(index - Math.floor(totalCards / 2));
          }

          const outfit = outfits ? (cardData as GeneratedOutfit) : null;
          const singleItem = singleItems ? (cardData as CustomWardrobeItem) : null;

          return (
            <motion.div
              key={outfit?.id || singleItem?.id || index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(-1)}
              onClick={() => {
                if (outfit && onSelectOutfit) onSelectOutfit(outfit);
                if (singleItem && onSelectItem) onSelectItem(singleItem);
              }}
              animate={{
                x: xOffset,
                y: yOffset,
                rotate: rotationDegrees,
                scale: isHovered ? 1.12 : 1.0,
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              style={{
                width: cardWidth,
                zIndex,
                transformOrigin: "bottom center",
              }}
              className={`absolute bottom-6 cursor-pointer rounded-2xl border transition-shadow duration-200 overflow-hidden bg-[var(--md-sys-color-surface-container-lowest)] shadow-xl ${
                isHovered
                  ? "border-[var(--md-sys-color-primary)] ring-4 ring-[var(--md-sys-color-primary)]/30 shadow-2xl"
                  : "border-[var(--md-sys-color-outline-variant)] hover:border-[var(--md-sys-color-primary)]"
              }`}
            >
              {outfit ? (
                /* Outfit Card Content */
                <div className="p-2.5 flex flex-col justify-between h-[230px] bg-[var(--md-sys-color-surface-container-lowest)]">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--md-sys-color-outline-variant)]">
                    <span className="px-1.5 py-0.5 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-[9px] font-mono font-bold rounded">
                      {outfit.temperatureText}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[var(--md-sys-color-primary)]">
                      {outfit.weatherMatchScore}%
                    </span>
                  </div>

                  {/* Collage Grid */}
                  <div className="grid grid-cols-2 gap-1 my-1.5 aspect-square bg-[var(--md-sys-color-surface-container)] p-1 rounded-xl border border-[var(--md-sys-color-outline-variant)] overflow-hidden">
                    {outfit.items.slice(0, 4).map((it, i) => (
                      <img
                        key={i}
                        src={it.image}
                        alt={it.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ))}
                  </div>

                  <div>
                    <h5 className="font-bold text-[11px] text-[var(--md-sys-color-on-surface)] line-clamp-1">
                      {outfit.title}
                    </h5>
                    <p className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] line-clamp-1 mt-0.5">
                      {outfit.stylingAdvice}
                    </p>
                  </div>

                  <div className="pt-1.5 border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-[9px] font-bold text-[var(--md-sys-color-primary)]">
                    <span>Inspect Look</span>
                    <MaterialIcon icon="arrow_forward" size={12} />
                  </div>
                </div>
              ) : singleItem ? (
                /* Single Item Card Content */
                <div className="p-2.5 flex flex-col justify-between h-[230px] bg-[var(--md-sys-color-surface-container-lowest)]">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]">
                    <img
                      src={singleItem.image}
                      alt={singleItem.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-black/70 text-white">
                      {singleItem.type === "user_upload" ? "📷 Gallery" : "🔖 Shop"}
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="text-[8px] font-mono font-bold text-[#386633] uppercase block">
                      {singleItem.category.replace("_", " ")}
                    </span>
                    <h5 className="font-bold text-[11px] text-[#18211e] line-clamp-1">
                      {singleItem.name}
                    </h5>
                  </div>

                  <div className="pt-1 border-t border-[#e8f3e8] flex items-center justify-between text-[9px] font-bold text-[#386633]">
                    <span>${singleItem.price?.toFixed(2) || "49.00"}</span>
                    <span>Try On</span>
                  </div>
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <span className="text-[11px] font-mono text-stone-400">
          Hover or drag across the arc cards to expand & fan neighboring fits
        </span>
      </div>
    </div>
  );
};
