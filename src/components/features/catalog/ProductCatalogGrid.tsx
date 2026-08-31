import React, { useState } from "react";
import { ProductItem } from "../../../types";
import { ProductCatalogCard } from "@/src/components/features/catalog/ProductCatalogCard";
import { MaterialIcon } from "../../MaterialIcon";

interface ProductCatalogGridProps {
  products: ProductItem[];
  isLoading: boolean;
  onSelectTryOn: (p: ProductItem) => void;
  onAddToCart?: (p: ProductItem) => void;
  onRequestMerchantCheckout: (product: ProductItem) => void;
  onOpenLens?: (p: ProductItem) => void;
  setGenkitModalProduct: (p: ProductItem) => void;
  setSpin360Product: (p: ProductItem) => void;
  fetchFeed: () => void;
}

export const ProductCatalogGrid: React.FC<ProductCatalogGridProps> = ({
  products, isLoading, onSelectTryOn, onAddToCart, onRequestMerchantCheckout, onOpenLens, setGenkitModalProduct, setSpin360Product, fetchFeed
}) => {
  const [elevatedCardId, setElevatedCardId] = useState<string | null>(null);
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  const toggleBookmark = (product: ProductItem) => {
    setBookmarkedIds(prev => ({ ...prev, [product.id]: !prev[product.id] }));
  };

  const handleCheckout = (product: ProductItem) => {
    onRequestMerchantCheckout(product);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-[#e8f3e8]/60 border border-[#d8ebd7] rounded-2xl flex items-center space-x-3 text-xs text-[#386633] font-medium">
        <MaterialIcon icon="refresh" size={18} className="text-[#386633]" />
        <span>Loading products...</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-10 bg-white rounded-3xl border border-[#d8ebd7] text-center space-y-4 max-w-md mx-auto my-6 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-[#e8f3e8] text-[#386633] flex items-center justify-center mx-auto">
          <MaterialIcon icon="search" size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base text-[#18211e]">No Live Search Results Loaded</h3>
          <p className="text-xs text-[#5e635f]">
            Chat with Spresso AI to express what you are looking for, or run a live search for current hot drops and retail deals.
          </p>
        </div>
        <button onClick={fetchFeed} className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 mx-auto">
          <MaterialIcon icon="refresh" size={16} />
          <span>Search Live Deals & Trends</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCatalogCard
          key={product.id}
          product={product}
          isElevated={elevatedCardId === product.id}
          bookmarked={!!bookmarkedIds[product.id]}
          addedToCart={addedToCartId === product.id}
          onElevate={() => setElevatedCardId(elevatedCardId === product.id ? null : product.id)}
          onBookmark={() => toggleBookmark(product)}
          onOpenLens={() => onOpenLens && onOpenLens(product)}
          onSpin360={() => setSpin360Product(product)}
          onSelectTryOn={() => onSelectTryOn(product)}
          onAddToCart={() => {
            if (onAddToCart) {
              onAddToCart(product);
              setAddedToCartId(product.id);
              setTimeout(() => setAddedToCartId(null), 2000);
            }
          }}
          onCheckout={() => handleCheckout(product)}
          onGenkitModal={() => setGenkitModalProduct(product)}
        />
      ))}
    </div>
  );
};
