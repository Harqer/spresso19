import React from "react";
import { MaterialIcon } from "../MaterialIcon";

interface AgentTemplateCardProps {
  tmpl: { id: string; icon: string; category: string; name: string; creator: string; description: string; promptExample: string };
  isActive: boolean;
  onSelect: () => void;
  onUseStyle: () => void;
}

export const AgentTemplateCard: React.FC<AgentTemplateCardProps> = ({ tmpl, isActive, onSelect, onUseStyle }) => {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 group ${
        isActive
          ? "bg-white border-[#386633] ring-2 ring-[#386633]/30 shadow-sm"
          : "bg-white border-[#d8ebd7] hover:border-[#386633]/60 hover:shadow-2xs"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 rounded-xl bg-[#e8f3e8] text-[#386633] flex items-center justify-center font-bold">
            <MaterialIcon icon={tmpl.icon} size={20} />
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7]">
            {tmpl.category}
          </span>
        </div>

        <div>
          <h4 className="text-xs font-bold text-[#18211e] group-hover:text-[#386633] transition">
            {tmpl.name}
          </h4>
          <p className="text-[10px] font-mono text-[#5e635f] mt-0.5">by {tmpl.creator}</p>
          <p className="text-xs text-[#5e635f] leading-snug mt-1.5 line-clamp-2">
            {tmpl.description}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between text-xs">
        <span className="text-[10px] font-mono text-[#386633] font-bold">Reference Template</span>
        <button
          onClick={e => {
            e.stopPropagation();
            onUseStyle();
          }}
          className="px-2.5 py-1 bg-[#f2f8f2] hover:bg-[#386633] hover:text-white text-[#386633] border border-[#d8ebd7] text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1"
        >
          <MaterialIcon icon="animation" size={14} />
          <span>Use Style</span>
        </button>
      </div>
    </div>
  );
};
