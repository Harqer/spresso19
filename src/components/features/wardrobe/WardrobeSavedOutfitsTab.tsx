import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { GeneratedOutfit } from "../../../types";

interface WardrobeSavedOutfitsTabProps {
  savedFavoriteOutfits: GeneratedOutfit[];
  setSavedFavoriteOutfits: (outfits: GeneratedOutfit[]) => void;
}

export const WardrobeSavedOutfitsTab: React.FC<WardrobeSavedOutfitsTabProps> = ({
  savedFavoriteOutfits, setSavedFavoriteOutfits
}) => {
  return (
    <div className="space-y-4 animate-fadeIn">
      {savedFavoriteOutfits.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
            <MaterialIcon icon="star" size={28} />
          </div>
          <h3 className="text-sm font-bold text-[#18211e]">No Saved Favorite Outfits Yet</h3>
          <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
            Generate outfits with the AI Weather Generator or build custom looks in Mix & Match to save them here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {savedFavoriteOutfits.map(outfit => (
            <div key={outfit.id} className="bg-white p-5 rounded-3xl border border-[#d8ebd7] space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#386633] bg-[#e8f3e8] px-2 py-0.5 rounded-md">
                    {outfit.temperatureText}
                  </span>
                  <h4 className="font-bold text-sm text-[#18211e] mt-1">{outfit.title}</h4>
                </div>

                <button
                  onClick={() => setSavedFavoriteOutfits(savedFavoriteOutfits.filter(o => o.id !== outfit.id))}
                  className="p-1.5 rounded-full text-red-600 hover:bg-red-50 cursor-pointer"
                  title="Remove from favorites"
                >
                  <MaterialIcon icon="delete" size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {outfit.items.map(it => (
                  <div key={it.id} className="aspect-square rounded-xl overflow-hidden bg-[#f2f8f2] border border-[#d8ebd7]">
                    <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#5e635f] bg-[#f2f8f2] p-3 rounded-xl leading-relaxed">
                {outfit.stylingAdvice}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
