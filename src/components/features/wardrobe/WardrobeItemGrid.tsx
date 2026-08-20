import React from "react";
import { CustomWardrobeItem, ProductItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { WardrobeItemCard } from "@/src/components/features/wardrobe/WardrobeItemCard";

interface WardrobeItemGridProps {
  items: CustomWardrobeItem[];
  products: ProductItem[];
  selectedCategory: string;
  selectedWeatherFilter: string;
  onSelectCategory: (cat: string) => void;
  onSelectWeatherFilter: (weather: string) => void;
  onDeleteItem: (item: CustomWardrobeItem) => void;
  onCheckoutProduct: (product: ProductItem) => void;
  onOpenUploadModal: () => void;
  wardrobeCategories: string[];
}

export const WardrobeItemGrid: React.FC<WardrobeItemGridProps> = ({
  items,
  products,
  selectedCategory,
  selectedWeatherFilter,
  onSelectCategory,
  onSelectWeatherFilter,
  onDeleteItem,
  onCheckoutProduct,
  onOpenUploadModal,
  wardrobeCategories
}) => {
  const activeCategories = wardrobeCategories.length > 0 ? wardrobeCategories : ["TOP", "BOTTOM", "SWEATER_OUTERWEAR", "SHOES", "ACCESSORY", "DRESS"];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-white p-4 rounded-2xl border border-[#d8ebd7] flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#18211e]">Category:</span>
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {["ALL", ...activeCategories].map(cat => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat ? "bg-[#386633] text-white" : "bg-[#f2f8f2] text-[#444748] hover:bg-[#e8f3e8]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-[#18211e]">Weather:</span>
          <select
            value={selectedWeatherFilter}
            onChange={e => onSelectWeatherFilter(e.target.value)}
            className="text-xs font-bold bg-[#f2f8f2] border border-[#d8ebd7] rounded-xl px-2.5 py-1 text-[#18211e]"
          >
            <option value="ALL">All Weathers</option>
            <option value="HOT_SUMMER">Hot Summer</option>
            <option value="COLD_WINTER">Cold Winter</option>
            <option value="MILD_SPRING_AUTUMN">Mild Spring</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
            <MaterialIcon icon="photo_library" size={28} />
          </div>
          <h3 className="text-sm font-bold text-[#18211e]">No Clothes Found in this Filter</h3>
          <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
            Snap photos of your clothes from your device gallery or bookmark products from the store!
          </p>
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold mx-auto cursor-pointer"
          >
            Snap Photo Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(item => (
            <WardrobeItemCard
              key={item.id}
              item={item}
              products={products}
              onDelete={onDeleteItem}
              onCheckoutProduct={onCheckoutProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
