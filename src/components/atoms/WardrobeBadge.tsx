import React from "react";

interface WardrobeBadgeProps {
  label: string;
  type: "upload" | "bookmark" | "weather" | "category" | "score";
  className?: string;
}

export const WardrobeBadge: React.FC<WardrobeBadgeProps> = ({ label, type, className = "" }) => {
  let baseStyles = "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs";
  
  if (type === "upload") {
    baseStyles += " bg-amber-100 text-amber-900 border border-amber-300";
  } else if (type === "bookmark") {
    baseStyles += " bg-emerald-100 text-emerald-900 border border-emerald-300";
  } else if (type === "weather") {
    baseStyles += " bg-[#f2f8f2] text-[#5e635f] text-[9px] px-1.5 rounded";
  } else if (type === "category") {
    baseStyles += " text-[#386633] uppercase text-[10px] bg-transparent shadow-none px-0";
  } else if (type === "score") {
    baseStyles += " bg-[#386633] text-white text-[10px]";
  }

  return (
    <span className={`${baseStyles} ${className}`.trim()}>
      {label}
    </span>
  );
};
