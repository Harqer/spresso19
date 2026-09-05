import React from "react";
import { ProductItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductPriceTag } from "@/src/components/features/catalog/ProductPriceTag";

interface ProductCatalogCardProps {
  product: ProductItem;
  isElevated: boolean;
  bookmarked: boolean;
  addedToCart: boolean;
  onElevate: () => void;
  onBookmark: () => void;
  onOpenLens: () => void;
  onSpin360: () => void;
  onSelectTryOn: () => void;
  onAddToCart: () => void;
  onCheckout: () => void;
  onGenkitModal: () => void;
}

export const ProductCatalogCard: React.FC<ProductCatalogCardProps> = ({
  product,
  isElevated,
  bookmarked,
  addedToCart,
  onElevate,
  onBookmark,
  onOpenLens,
  onSpin360,
  onSelectTryOn,
  onAddToCart,
  onCheckout,
  onGenkitModal
}) => (
  <div className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between group overflow-hidden ${isElevated ? "md3-card-level-4 -translate-y-2.5 z-20 ring-2 ring-[var(--md-sys-color-primary)] border-transparent" : "md3-card-level-2 hover:border-[var(--md-sys-color-primary)] hover:-translate-y-2 hover:shadow-2xl hover:z-10"}`}>
    <div onClick={onElevate} className="relative aspect-square overflow-hidden bg-[#f2f8f2] dark:bg-[#12221b] rounded-2xl group/img cursor-pointer">
      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <button onClick={(e) => { e.stopPropagation(); onBookmark(); }} className={`absolute bottom-3 left-3 p-2 rounded-full backdrop-blur-md transition cursor-pointer shadow-md border ${bookmarked ? "bg-[#386633] text-white" : "bg-white/90 text-[#386633] hover:scale-105"}`}>
        <MaterialIcon icon={bookmarked ? "bookmark" : "bookmark_add"} size={16} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onOpenLens(); }} className="absolute top-3 right-3 px-2.5 py-1 bg-stone-900/80 hover:bg-orange-600 text-white rounded-full shadow-md flex space-x-1 cursor-pointer">
        <MaterialIcon icon="center_focus_strong" size={13} className="text-orange-400" /><span>Lens</span>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onSpin360(); }} className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-full border bg-white/90 text-[#18211e] cursor-pointer flex space-x-1">
        <MaterialIcon icon="360" size={16} className="text-[#386633]" /><span>360°</span>
      </button>
    </div>
    <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
      <div onClick={onElevate} className="space-y-2 cursor-pointer group/text">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase font-bold text-[#5e635f]">{product.brand}</span>
          <div className="flex items-center space-x-1 text-amber-600 text-xs font-bold"><MaterialIcon icon="star" size={14} filled className="text-amber-500" /><span>{product.rating}</span></div>
        </div>
        <h3 className="font-bold text-sm text-[#18211e] group-hover/text:text-[#ff5e1a] transition-colors flex items-center justify-between">
          <span>{product.name}</span><MaterialIcon icon={isElevated ? "expand_less" : "expand_more"} size={18} />
        </h3>
        <p className={`text-xs text-[#5e635f] leading-relaxed transition-all ${isElevated ? "" : "line-clamp-2"}`}>{product.description}</p>
        {isElevated && (
          <div className="p-3 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[#2d4d29] font-semibold border-b border-[#d8ebd7] pb-1.5">
              <span className="flex items-center space-x-1"><MaterialIcon icon="verified" size={14} /><span>Verify availability at checkout</span></span>
              <span className="text-[#ff5e1a]">SKU: {product.sku}</span>
            </div>
            {product.merchantUrl && <a href={product.merchantUrl} target="_blank" rel="noopener noreferrer" className="text-[#386633] underline underline-offset-2">View retailer listing</a>}
          </div>
        )}
      </div>
      <div className="pt-3 border-t border-[#f2f8f2] space-y-3">
        <div className="flex items-center justify-between">
          <ProductPriceTag
            price={product.price}
            originalPrice={product.originalPrice}
            observedPrice={product.listing?.observedPrice}
            merchantUrl={product.listing?.merchantUrl}
          />
          <div className="flex items-center space-x-1.5">
            <button onClick={onGenkitModal} className="px-2.5 py-2 rounded-xl border"><MaterialIcon icon="auto_awesome" size={16} /></button>
            <button onClick={onSelectTryOn} className="px-3 py-2 rounded-xl bg-[#e8f3e8] border"><MaterialIcon icon="animation" size={18} /></button>
            <button onClick={onAddToCart} className={`p-2.5 rounded-xl border ${addedToCart ? "bg-[#386633] text-white" : ""}`}><MaterialIcon icon={addedToCart ? "check" : "add_shopping_cart"} size={18} /></button>
            <button onClick={onCheckout} className="p-2.5 rounded-xl bg-[#386633] text-white"><MaterialIcon icon="shopping_bag" size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  </div>
);
