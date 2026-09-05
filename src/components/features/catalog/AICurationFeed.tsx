import React from "react";
import { ProductItem } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { displayListingPrice } from "../../../lib/discoveryRepository";

interface AICurationFeedProps {
  curatedPersonalizedProducts: ProductItem[];
  onSelectTryOn: (p: ProductItem) => void;
}

export const AICurationFeed: React.FC<AICurationFeedProps> = ({ curatedPersonalizedProducts, onSelectTryOn }) => {
  if (curatedPersonalizedProducts.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-stone-900 via-[#1c2924] to-stone-900 text-white p-6 rounded-3xl border border-stone-800 shadow-md space-y-4 relative overflow-hidden animate-fadeIn">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 space-y-3">
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-medium text-emerald-300">Curated picks</span>
          <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
            <MaterialIcon icon="recommend" size={14} />
            <span>Personalized For You</span>
          </span>
        </div>
        
        <h3 className="font-headline font-semibold text-xs sm:text-sm text-stone-200">
          We are curating your personalized recommendations, exclusive deals, and trending styles based on your unique fashion profile as we learn more about your tastes.
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {curatedPersonalizedProducts.map(p => (
            <div key={p.id} onClick={() => onSelectTryOn(p)} className="bg-stone-950/40 p-3 rounded-2xl border border-white/10 hover:border-emerald-500/50 transition cursor-pointer flex items-center space-x-3 group animate-scaleUp">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-stone-900">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition">{p.name}</h4>
                {p.listing?.merchantUrl ? <a href={p.listing.merchantUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()} className="text-[10px] text-emerald-300 underline underline-offset-2 font-mono block">{displayListingPrice(p.listing)} · View retailer</a> : <span className="text-[10px] text-stone-400 font-mono block">Price at merchant</span>}
                {p.rating ? (
                <div className="flex items-center space-x-1 text-[10px] font-medium text-stone-300">
                  <MaterialIcon icon="star" size={10} className="text-[#386633] dark:text-[#9cd695]" />
                  <span>{p.rating}</span>
                </div>
              ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
