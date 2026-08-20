import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface Category {
  id: string;
  label: string;
  icon?: string;
}

interface GoogleLensCategoryTabsProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const GoogleLensCategoryTabs: React.FC<GoogleLensCategoryTabsProps> = ({
  categories,
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none z-10 relative">
      {categories.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
            activeTab === tab.id
              ? "bg-orange-500 text-white border-orange-500 shadow-sm scale-102"
              : "bg-white/5 text-white/60 border-transparent hover:border-white/20 hover:bg-white/10"
          }`}
        >
          {tab.icon && <MaterialIcon icon={tab.icon} size={14} />}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
