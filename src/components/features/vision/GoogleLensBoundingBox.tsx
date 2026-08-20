import React, { useRef, useState, useEffect } from "react";

interface GoogleLensBoundingBoxProps {
  cropBox: { ymin: number; xmin: number; ymax: number; xmax: number } | null;
  startPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
  onChange?: (cropBox: { ymin: number; xmin: number; ymax: number; xmax: number }) => void;
  onResizeEnd?: (cropBox: { ymin: number; xmin: number; ymax: number; xmax: number }) => void;
  containerRect?: { width: number; height: number } | null;
}

export const GoogleLensBoundingBox: React.FC<GoogleLensBoundingBoxProps> = ({
  cropBox,
  startPoint,
  currentPoint,
  onChange,
  onResizeEnd,
  containerRect,
}) => {
  const [isResizing, setIsResizing] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!isResizing || !cropBox || !containerRect || !onChange) return;

      const rect = containerRect;
      const xPct = Math.max(0, Math.min(1000, Math.round((e.offsetX / rect.width) * 1000)));
      const yPct = Math.max(0, Math.min(1000, Math.round((e.offsetY / rect.height) * 1000)));
      
      const newBox = { ...cropBox };

      if (isResizing.includes("n")) newBox.ymin = Math.min(newBox.ymax - 10, yPct);
      if (isResizing.includes("s")) newBox.ymax = Math.max(newBox.ymin + 10, yPct);
      if (isResizing.includes("w")) newBox.xmin = Math.min(newBox.xmax - 10, xPct);
      if (isResizing.includes("e")) newBox.xmax = Math.max(newBox.xmin + 10, xPct);

      onChange(newBox);
    };

    const handleGlobalPointerUp = () => {
      setIsResizing(null);
      if (cropBox && onResizeEnd) {
        onResizeEnd(cropBox);
      }
    };

    if (isResizing) {
      document.addEventListener("pointermove", handleGlobalPointerMove);
      document.addEventListener("pointerup", handleGlobalPointerUp);
    }
    
    return () => {
      document.removeEventListener("pointermove", handleGlobalPointerMove);
      document.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [isResizing, cropBox, containerRect, onChange]);

  if (cropBox) {
    const handlePointerDown = (corner: string) => (e: React.PointerEvent) => {
      e.stopPropagation(); // prevent drawing new box
      setIsResizing(corner);
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    return (
      <div
        className="absolute border-2 border-white rounded-2xl bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.4)] transition-all duration-150 touch-none"
        style={{
          top: `${cropBox.ymin / 10}%`,
          left: `${cropBox.xmin / 10}%`,
          width: `${(cropBox.xmax - cropBox.xmin) / 10}%`,
          height: `${(cropBox.ymax - cropBox.ymin) / 10}%`,
        }}
      >
        <div 
          onPointerDown={handlePointerDown("nw")} 
          className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg cursor-nwse-resize" 
        />
        <div 
          onPointerDown={handlePointerDown("ne")} 
          className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg cursor-nesw-resize" 
        />
        <div 
          onPointerDown={handlePointerDown("sw")} 
          className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg cursor-nesw-resize" 
        />
        <div 
          onPointerDown={handlePointerDown("se")} 
          className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg cursor-nwse-resize" 
        />
      </div>
    );
  }

  if (startPoint && currentPoint) {
    const xmin = Math.max(0, Math.min(startPoint.x, currentPoint.x));
    const xmax = Math.max(0, Math.max(startPoint.x, currentPoint.x));
    const ymin = Math.max(0, Math.min(startPoint.y, currentPoint.y));
    const ymax = Math.max(0, Math.max(startPoint.y, currentPoint.y));

    return (
      <div
        className="absolute border-2 border-dashed border-emerald-400 bg-emerald-400/20 rounded-xl pointer-events-none"
        style={{
          left: `${xmin}px`,
          top: `${ymin}px`,
          width: `${xmax - xmin}px`,
          height: `${ymax - ymin}px`,
        }}
      />
    );
  }

  return null;
};
