import React from "react";

interface ProductPriceTagProps {
  price?: number;
  originalPrice?: number;
  observedPrice?: { amount: number; currency: string };
  merchantUrl?: string;
}

export const ProductPriceTag: React.FC<ProductPriceTagProps> = ({ price, originalPrice, observedPrice, merchantUrl }) => {
  if (!observedPrice) {
    return merchantUrl ? (
      <a href={merchantUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#386633] underline underline-offset-2">
        Price at merchant
      </a>
    ) : <span className="text-sm font-semibold text-[#5e635f] dark:text-[#94a3b8]">Price at merchant</span>;
  }
  const observedAmount = observedPrice.amount;
  const origPrice = originalPrice || observedAmount;
  const discountPct = origPrice > 0 ? Math.round(((origPrice - observedAmount) / origPrice) * 100) : 0;
  const currency = observedPrice.currency || "USD";
  const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(observedAmount);

  return (
    <div>
      <span className="text-[10px] text-[#5e635f] dark:text-[#94a3b8] block font-mono">Spresso Price</span>
      <div className="flex items-baseline space-x-2">
        <span className="text-lg font-bold text-[#386633] dark:text-[#81c784] font-mono">
          {formatted}
        </span>
        {origPrice > observedAmount && (
          <>
            <span className="text-xs text-[#8c918e] dark:text-[#64748b] line-through font-mono">
              {new Intl.NumberFormat(undefined, { style: "currency", currency }).format(origPrice)}
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
