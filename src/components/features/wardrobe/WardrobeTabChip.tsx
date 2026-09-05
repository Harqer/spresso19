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
        <span className="text-[10px] font-medium">({count})</span>
      )}
    </button>
  );
};
