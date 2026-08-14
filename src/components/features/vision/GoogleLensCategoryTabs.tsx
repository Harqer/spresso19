import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface GoogleLensCategoryTabsProps {
  activeTab: "all" | "gourmet" | "shopping" | "web";
  onTabChange: (tab: "all" | "gourmet" | "shopping" | "web") => void;
}

export const GoogleLensCategoryTabs: React.FC<GoogleLensCategoryTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs = [
    { id: "all", label: "All Visual Results", icon: "grid_view" },
    { id: "gourmet", label: "Gourmet & Dining", icon: "restaurant" },
    { id: "shopping", label: "Fashion & Store", icon: "shopping_bag" },
    { id: "web", label: "Google Grounded", icon: "travel_explore" },
  ] as const;

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
            activeTab === tab.id
              ? "bg-white text-slate-950 border-white shadow-sm scale-102"
              : "bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/20 hover:bg-slate-800/60"
          }`}
        >
          <MaterialIcon name={tab.icon} className="text-sm" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
