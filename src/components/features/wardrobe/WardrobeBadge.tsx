import React from "react";
import { cn } from "../../../utils/cn";

interface WardrobeBadgeProps {
  label: string;
  type: "upload" | "bookmark" | "weather" | "category" | "score";
  className?: string;
}

export const WardrobeBadge: React.FC<WardrobeBadgeProps> = ({ label, type, className = "" }) => {
  const baseStyles = "px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs";
  
  const typeStyles = {
    upload: "bg-amber-100 text-amber-900 border border-amber-300",
    bookmark: "bg-emerald-100 text-emerald-900 border border-emerald-300",
    weather: "bg-[#f2f8f2] text-[#5e635f] text-[9px] px-1.5 rounded",
    category: "text-[#386633] uppercase text-[10px] bg-transparent shadow-none px-0",
    score: "bg-[#386633] text-white text-[10px]"
  };

  return (
    <span className={cn(baseStyles, typeStyles[type], className)}>
      {label}
    </span>
  );
};
