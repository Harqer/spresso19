import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GeneratedOutfit, CustomWardrobeItem } from "../types";

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
  radius = 260,
  cardWidth = 160,
}) => {
  const [isFanned, setIsFanned] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);
  const [mouseCoords, setMouseCoords] = useState<{ [key: number]: { x: number; y: number } }>({});

  const cards = outfits || singleItems || [];
  const totalCards = cards.length;

  if (totalCards === 0) return null;

  const arcSize = 0.26 * 2 * Math.PI;
  const arcStart = 0.75 * 2 * Math.PI - arcSize / 2;
  const arcStep = totalCards > 1 ? arcSize / (totalCards - 1) : 0;

  const handleMouseMove = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // range: -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // range: -0.5 to 0.5
    setMouseCoords(prev => ({ ...prev, [index]: { x, y } }));
  };

  const handleMouseLeave = (index: number) => {
    setHoveredIndex(-1);
    setMouseCoords(prev => ({ ...prev, [index]: { x: 0, y: 0 } }));
  };

  const handleCardClick = (index: number, cardData: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFanned) {
      setIsFanned(true);
      return;
    }

    const outfit = outfits ? (cardData as GeneratedOutfit) : null;
    const singleItem = singleItems ? (cardData as CustomWardrobeItem) : null;

    if (outfit && onSelectOutfit) onSelectOutfit(outfit);
    if (singleItem && onSelectItem) onSelectItem(singleItem);
  };

  return (
    <div
      onClick={() => setIsFanned(prev => !prev)}
      className="relative w-full overflow-hidden py-16 flex items-center justify-center min-h-[460px] select-none rounded-3xl backdrop-blur-xl bg-stone-950/60 shadow-2xl shadow-black/80 border border-stone-800/80 cursor-pointer transition-colors duration-300 hover:bg-stone-950/70"
    >
      <div className="relative w-full max-w-4xl h-[340px] flex items-end justify-center">
        {cards.map((cardData, index) => {
          const outfit = outfits ? (cardData as GeneratedOutfit) : null;
          const singleItem = singleItems ? (cardData as CustomWardrobeItem) : null;
          const imageUrl = outfit ? (outfit.items[0]?.image || "") : (singleItem?.image || "");

          // Angle position on the fanned arc
          const currentAngle = arcStart + index * arcStep;

          // Target translation & rotation based on fanning state
          const targetX = isFanned ? radius * Math.cos(currentAngle) : 0;
          const targetY = isFanned
            ? radius * Math.sin(currentAngle) + radius - 20
            : (totalCards - index - 1) * -5;

          const targetRotation = isFanned
            ? (currentAngle * 180) / Math.PI + 90
            : (index - (totalCards - 1) / 2) * 3;

          const isHovered = hoveredIndex === index;
          const coords = mouseCoords[index] || { x: 0, y: 0 };

          // Prioritize active, fanned, or hovered cards
          const zIndex = isHovered
            ? 100
            : isFanned
            ? 30 - Math.abs(index - Math.floor(totalCards / 2))
            : index + 10;

          return (
            <motion.div
              key={outfit?.id || singleItem?.id || index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => handleMouseLeave(index)}
              onMouseMove={(e) => handleMouseMove(index, e)}
              onClick={(e) => handleCardClick(index, cardData, e)}
              animate={{
                x: targetX,
                y: targetY,
                rotate: targetRotation,
                scale: isHovered ? 1.08 : 1.0,
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 24,
              }}
              style={{
                width: cardWidth,
                height: cardWidth * 1.35,
                zIndex,
                transformOrigin: "bottom center",
              }}
              className={`absolute bottom-8 rounded-2xl overflow-hidden shadow-2xl transition-shadow duration-300 border-2 bg-stone-900 ${
                isHovered
                  ? "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.35)]"
                  : "border-stone-700/80 shadow-black/60"
              }`}
            >
              {/* Inner Parallax container */}
              <motion.div
                className="w-full h-full relative"
                animate={{
                  x: coords.x * -18,
                  y: coords.y * -18,
                  scale: 1.15,
                }}
                transition={{
                  type: "spring",
                  stiffness: 140,
                  damping: 18,
                }}
              >
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none select-none"
                />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
