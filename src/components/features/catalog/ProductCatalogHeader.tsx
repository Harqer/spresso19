import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

export const CATEGORY_TILES = [
  { id: "ALL", label: "All Items", icon: "grid_view" },
  { id: "Trending", label: "Trending", icon: "local_fire_department" },
  { id: "Winter Wear", label: "Winter Wear", icon: "ac_unit" },
  { id: "Sports Wear", label: "Sports Wear", icon: "fitness_center" },
  { id: "Makeup", label: "Makeup & Beauty", icon: "brush" },
  { id: "Accessories", label: "Accessories", icon: "watch" },
  { id: "Smart Wearables", label: "Wearables", icon: "smart_toy" },
  { id: "Electronics", label: "Electronics", icon: "headphones" },
];

interface ProductCatalogHeaderProps {
  userLocation: string | null;
  searchRadius: number;
  totalItems: number;
  selectedCategory: string;
  onRequestLocationPermission: () => void;
  onSelectCategory: (catId: string) => void;
}

export const ProductCatalogHeader: React.FC<ProductCatalogHeaderProps> = ({
  userLocation,
  searchRadius,
  totalItems,
  selectedCategory,
  onRequestLocationPermission,
  onSelectCategory
}) => {
  return (
    <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[#18211e] font-headline">Products</h2>
          <p className="text-xs text-[#5e635f]">
            {userLocation ? `Comparing deals & stock near ${userLocation} within a ${searchRadius}-mile radius` : "Browse products & compare local store deals"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onRequestLocationPermission} className="px-3 py-1.5 bg-[#f2f8f2] hover:bg-[#e8f3e8] text-[#18211e] border border-[#d8ebd7] rounded-full text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs group">
            <MaterialIcon icon="location_on" size={14} className="text-[#386633]" />
            <span className="truncate max-w-[150px] font-bold">{userLocation ? `${userLocation} (${searchRadius} mi)` : "Set Location"}</span>
            <MaterialIcon icon="unfold_more" size={14} className="text-[#5e635f] group-hover:text-[#386633]" />
          </button>
          <span className="text-xs text-[#5e635f] font-mono bg-[#f2f8f2] px-3 py-1.5 rounded-full font-semibold border border-[#d8ebd7]">
            {totalItems} Items
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORY_TILES.map(cat => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className={`flex flex-col items-center justify-center p-3 min-w-[80px] rounded-2xl border transition-all cursor-pointer group ${isSelected ? "bg-[#386633] text-white border-[#386633] shadow-xs scale-105" : "bg-[#f2f8f2] text-[#18211e] border-[#d8ebd7] hover:border-[#386633] hover:bg-white"}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition ${isSelected ? "bg-white/20 text-white" : "bg-white text-[#386633] shadow-xs"}`}>
                <MaterialIcon icon={cat.icon} size={20} />
              </div>
              <span className="text-[11px] font-bold truncate max-w-[76px]">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
