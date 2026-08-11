import React from "react";

interface WardrobeTabChipProps {
  id: string;
  label: string;
  count: number | null;
  isActive: boolean;
  onClick: () => void;
}

export const WardrobeTabChip: React.FC<WardrobeTabChipProps> = ({ label, count, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
        isActive
          ? "bg-[#386633] text-white shadow-xs"
          : "bg-white text-[#5e635f] hover:bg-[#e8f3e8] hover:text-[#18211e] border border-[#d8ebd7]"
      }`}
    >
      <span>{label}</span>
      {count !== null && (
        <span className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
          isActive ? "bg-white/20 text-white" : "bg-[#e8f3e8] text-[#386633]"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};
