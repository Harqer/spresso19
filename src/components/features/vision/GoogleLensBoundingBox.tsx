import React from "react";

interface GoogleLensBoundingBoxProps {
  cropBox: { ymin: number; xmin: number; ymax: number; xmax: number } | null;
  startPoint: { x: number; y: number } | null;
  currentPoint: { x: number; y: number } | null;
}

export const GoogleLensBoundingBox: React.FC<GoogleLensBoundingBoxProps> = ({
  cropBox,
  startPoint,
  currentPoint,
}) => {
  if (cropBox) {
    return (
      <div
        className="absolute border-2 border-white rounded-2xl bg-white/10 shadow-[0_0_24px_rgba(255,255,255,0.4)] transition-all duration-150 pointer-events-none"
        style={{
          top: `${cropBox.ymin}%`,
          left: `${cropBox.xmin}%`,
          width: `${cropBox.xmax - cropBox.xmin}%`,
          height: `${cropBox.ymax - cropBox.ymin}%`,
        }}
      >
        <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
        <div className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
        <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
      </div>
    );
  }

  if (startPoint && currentPoint) {
    const xmin = Math.min(startPoint.x, currentPoint.x);
    const xmax = Math.max(startPoint.x, currentPoint.x);
    const ymin = Math.min(startPoint.y, currentPoint.y);
    const ymax = Math.max(startPoint.y, currentPoint.y);

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
