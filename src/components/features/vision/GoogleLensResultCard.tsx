import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

interface GoogleLensResultCardProps {
  region: {
    id: number;
    label: string;
    price?: string;
    source?: string;
    thumbnail?: string;
    category?: string;
    description?: string;
    isLocation?: boolean;
  };
  isSelected: boolean;
  onSelect: () => void;
  onSelectTryOn?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  onShowLocationDetails?: () => void;
}

export const GoogleLensResultCard: React.FC<GoogleLensResultCardProps> = ({
  region,
  isSelected,
  onSelect,
  onSelectTryOn,
  onAddToCart,
  onShowLocationDetails,
}) => {
  const numericPrice = region.price ? parseFloat(region.price.replace(/[^0-9.]/g, "")) || 0 : 0;

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "bg-slate-800/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10 scale-[1.01]"
          : "bg-slate-900/50 border-white/10 hover:border-white/20 hover:bg-slate-800/50"
      }`}
    >
      <div className="flex items-start space-x-3">
        {region.thumbnail ? (
          <img
            src={region.thumbnail}
            alt={region.label}
            className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center flex-shrink-0 text-slate-400">
            <MaterialIcon name="image" className="text-xl" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-white truncate">{region.label}</h4>
            {region.price && (
              <span className="text-xs font-mono font-extrabold text-emerald-400">{region.price}</span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 line-clamp-2">{region.description || "Visual item detected"}</p>

          <div className="flex items-center justify-between pt-2 gap-2">
            <span className="text-[10px] text-slate-500 font-mono">{region.source || "Google Catalog"}</span>

            <div className="flex items-center space-x-2">
              {region.isLocation ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowLocationDetails?.();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-500/30 transition-colors flex items-center space-x-1"
                >
                  <MaterialIcon name="place" className="text-xs" />
                  <span>Inspect Store Location</span>
                </button>
              ) : (
                <>
                  {onSelectTryOn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTryOn({
                          id: String(region.id),
                          name: region.label,
                          price: numericPrice,
                          image: region.thumbnail || "",
                          brand: region.source || "Spresso",
                          category: region.category || "Apparel",
                          description: region.description || "",
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold hover:bg-emerald-500/30 transition-colors flex items-center space-x-1"
                    >
                      <MaterialIcon name="checkroom" className="text-xs" />
                      <span>Virtual Try-On</span>
                    </button>
                  )}

                  {onAddToCart && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart({
                          id: String(region.id),
                          name: region.label,
                          price: numericPrice,
                          image: region.thumbnail || "",
                          brand: region.source || "Spresso",
                          category: region.category || "Apparel",
                          description: region.description || "",
                        });
                      }}
                      className="p-1.5 rounded-lg bg-slate-700 text-white hover:bg-emerald-600 transition-colors"
                      title="Add to Cart"
                    >
                      <MaterialIcon name="add_shopping_cart" className="text-xs" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
