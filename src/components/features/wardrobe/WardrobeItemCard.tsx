import React from "react";
import { CustomWardrobeItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";

interface WardrobeItemCardProps {
  item: CustomWardrobeItem;
  products: ProductItem[];
  onDelete: (item: CustomWardrobeItem) => void;
  onCheckoutProduct: (product: ProductItem) => void;
}

export const WardrobeItemCard: React.FC<WardrobeItemCardProps> = ({ item, products, onDelete, onCheckoutProduct }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#d8ebd7] hover:border-[#386633] transition overflow-hidden shadow-xs flex flex-col justify-between group">
      <div className="relative aspect-square overflow-hidden bg-[#f2f8f2]">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />

        <button
          onClick={() => onDelete(item)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-red-600 hover:bg-red-600 hover:text-white transition shadow-sm cursor-pointer"
          title="Remove from Wardrobe"
        >
          <MaterialIcon icon="delete" size={15} />
        </button>
      </div>

      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[10px] text-[#5e635f] leading-relaxed">
            {item.type === "user_upload" ? "From your gallery" : "Saved from the catalog"} · {item.category.replace("_", " ").toLowerCase()} · {item.weatherSuitability === "COLD_WINTER" ? "winter" : item.weatherSuitability === "HOT_SUMMER" ? "summer" : "all weather"}
          </p>
          <h4 className="font-bold text-xs text-[#18211e] mt-1 line-clamp-1">{item.name}</h4>
        </div>

        <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between">
          {!isNaN(Number(item.price)) && Number(item.price) > 0 ? (
            <span className="text-sm font-mono font-bold text-[#386633]">${Number(item.price).toFixed(2)}</span>
          ) : (
            <span className="text-[10px] text-[#5e635f] font-mono">Personal Wardrobe</span>
          )}

          {item.productId && (
            <button
              onClick={() => {
                const found = products.find(p => p.id === item.productId);
                if (found) onCheckoutProduct(found);
              }}
              className="px-2.5 py-1 bg-[#386633] hover:bg-[#2c5227] text-white rounded-lg text-[10px] font-bold cursor-pointer transition"
            >
              Buy Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
