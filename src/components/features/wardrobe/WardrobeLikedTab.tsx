import Logger from "../../../lib/Logger";
import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";

interface WardrobeLikedTabProps {
  likedProducts: any[];
  setLikedProducts: (products: any[]) => void;
  onSelectTryOn: (product: ProductItem) => void;
  onCheckoutProduct: (product: ProductItem) => void;
}

export const WardrobeLikedTab: React.FC<WardrobeLikedTabProps> = ({
  likedProducts, setLikedProducts, onSelectTryOn, onCheckoutProduct
}) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-[#18211e]">Liked Products</h3>
          <p className="text-xs text-[#5e635f] mt-0.5">Products you liked using the widget Floating Action Button (FAB) during Google Lens or Virtual Try-On sessions.</p>
        </div>
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-mono font-bold rounded-full border border-rose-300">
          {likedProducts.length} Liked
        </span>
      </div>

      {likedProducts.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <MaterialIcon icon="favorite" size={28} />
          </div>
          <h3 className="text-sm font-bold text-[#18211e]">No Liked Products Yet</h3>
          <p className="text-xs text-[#5e635f] max-w-sm mx-auto">Tap the floating action button (FAB) in Google Lens or Virtual Try-On to like any product!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {likedProducts.map((prod, idx) => {
            const prodId = prod.id || prod.sku || `liked-${idx}`;
            return (
              <div key={prodId} className="bg-white rounded-2xl border border-[#d8ebd7] hover:border-rose-400 transition overflow-hidden shadow-xs flex flex-col justify-between group">
                <div className="relative aspect-square overflow-hidden bg-[#f2f8f2]">
                  <img src={prod.image} alt={prod.name} onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400/f2f8f2/386633?text=No+Image"; }} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-xs bg-rose-500 text-white flex items-center space-x-1">
                    <MaterialIcon icon="favorite" size={10} /><span>Liked</span>
                  </span>
                  <button onClick={() => {
                    const prodId = prod.id || prod.sku || `liked-${idx}`;
                    const updated = likedProducts.filter(p => (p.id || p.sku) !== (prod.id || prod.sku));
                    setLikedProducts(updated);
                    const toggleUserLike = httpsCallable(functions, "toggleUserLike");
                    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `like-${Date.now()}-${Math.random()}`;
                    toggleUserLike({ productId: prodId, idempotencyKey }).catch(console.error);
                  }} aria-label="Remove from Liked" className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-rose-600 hover:bg-rose-600 hover:text-white transition shadow-sm cursor-pointer" title="Remove from Liked">
                    <MaterialIcon icon="delete" size={15} />
                  </button>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#386633] uppercase">{prod.brand || prod.category || "E-Commerce"}</span>
                    <h4 className="font-bold text-xs text-[#18211e] mt-1 line-clamp-1">{prod.name}</h4>
                  </div>
                  <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-[#386633]">{typeof prod.price === "number" ? `$${prod.price.toFixed(2)}` : prod.price ? `$${prod.price}` : ""}</span>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => onSelectTryOn(prod)} className="px-2 py-1 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center space-x-0.5" title="Virtual Try-On">
                        <MaterialIcon icon="styler" size={12} /><span>Try On</span>
                      </button>
                      <button onClick={() => onCheckoutProduct(prod)} className="px-2.5 py-1 bg-[#386633] hover:bg-[#2c5227] text-white rounded-lg text-[10px] font-bold cursor-pointer transition">
                        Buy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
