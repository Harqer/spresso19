import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

export const QuickPromptsGrid = ({ quickPrompts, onSelectPrompt }: { quickPrompts: any[]; onSelectPrompt: (prompt: string) => void }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-left">
      {quickPrompts.map((card) => (
        <div
          key={card.id}
          onClick={() => onSelectPrompt(card.prompt)}
          className="group p-5 bg-white dark:bg-[#141719] border border-[#e0e4db] dark:border-[#22272a] hover:border-[#386633] dark:hover:border-[#9cd695] rounded-3xl transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 active:scale-[0.98]"
        >
          <div>
            <div className="w-9 h-9 rounded-full bg-[#f4f7f3] dark:bg-[#1a211a] text-[#386633] dark:text-[#9cd695] flex items-center justify-center">
              <MaterialIcon icon={card.icon} size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface)] group-hover:text-[#386633] dark:group-hover:text-[#9cd695] transition-colors">
              {card.title}
            </h3>
            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-snug mt-1">
              {card.subtitle}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
