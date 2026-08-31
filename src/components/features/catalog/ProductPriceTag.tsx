import React from "react";

interface ProductPriceTagProps {
  price: number;
  originalPrice?: number;
  isObserved?: boolean;
}

export const ProductPriceTag: React.FC<ProductPriceTagProps> = ({ price, originalPrice, isObserved = true }) => {
  if (!isObserved) {
    return <span className="text-sm font-semibold text-[#5e635f] dark:text-[#94a3b8]">Price at merchant</span>;
  }
  const origPrice = originalPrice || price;
  const discountPct = Math.round(((origPrice - price) / origPrice) * 100);

  return (
    <div>
      <span className="text-[10px] text-[#5e635f] dark:text-[#94a3b8] block font-mono">Spresso Price</span>
      <div className="flex items-baseline space-x-2">
        <span className="text-lg font-bold text-[#386633] dark:text-[#81c784] font-mono">
          ${price.toFixed(2)}
        </span>
        {origPrice > price && (
          <>
            <span className="text-xs text-[#8c918e] dark:text-[#64748b] line-through font-mono">
              ${origPrice.toFixed(2)}
            </span>
            <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-[#386633] dark:text-emerald-400 text-[9px] font-bold font-mono rounded">
              SAVE {discountPct}%
            </span>
          </>
        )}
      </div>
    </div>
  );
};
