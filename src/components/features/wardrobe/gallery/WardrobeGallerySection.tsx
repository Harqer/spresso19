import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";

interface WardrobePhoto {
  id: string;
  title: string;
  category: string;
  photoUrl: string;
}

interface WardrobeGallerySectionProps {
  photos: WardrobePhoto[];
  handleAddPhoto: () => void;
  onOpenTryOn: (product: any) => void;
}

export const WardrobeGallerySection: React.FC<WardrobeGallerySectionProps> = ({
  photos, handleAddPhoto, onOpenTryOn
}) => {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-extrabold text-[#191d16] dark:text-[#e1e4d9] uppercase tracking-wider font-mono">
        Photo Gallery Looks ({photos.length})
      </h2>

      {photos.length === 0 ? (
        <div
          onClick={handleAddPhoto}
          className="w-full h-48 border-2 border-dashed border-[#446732] dark:border-[#a9d291] rounded-2xl bg-[#f4f7f2] dark:bg-[#161a13] flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-[#e8efe0] transition"
        >
          <div className="w-12 h-12 rounded-xl bg-[#446732] text-white flex items-center justify-center shadow-md">
            <MaterialIcon icon="add" size={28} />
          </div>
          <span className="text-xs font-extrabold text-[#446732] dark:text-[#a9d291]">
            Tap Plus to Add Your First Wardrobe Photo
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <div
            onClick={handleAddPhoto}
            className="h-56 border-2 border-dashed border-[#446732] dark:border-[#a9d291] rounded-2xl bg-[#f4f7f2] dark:bg-[#161a13] flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-[#e8efe0] transition"
          >
            <div className="w-10 h-10 rounded-xl bg-[#446732] text-white flex items-center justify-center shadow-xs">
              <MaterialIcon icon="add" size={24} />
            </div>
            <span className="text-[11px] font-bold text-[#446732] dark:text-[#a9d291]">Add Look</span>
          </div>

          {photos.map(p => (
            <div key={p.id} className="h-56 bg-white dark:bg-[#191d16] rounded-2xl border border-[#dfe4d7] dark:border-[#43483e] overflow-hidden flex flex-col justify-between group shadow-xs hover:shadow-md transition">
              <div className="relative w-full h-36 bg-stone-900 overflow-hidden">
                <img src={p.photoUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <span className="absolute top-2 right-2 text-[9px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded uppercase">
                  {p.category}
                </span>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs font-bold truncate text-[#191d16] dark:text-[#e1e4d9]">{p.title}</span>
                <button
                  onClick={() => onOpenTryOn(null)}
                  className="px-2.5 py-1 bg-[#e8efe0] dark:bg-[#282b24] hover:bg-[#446732] hover:text-white text-[#446732] dark:text-[#a9d291] font-bold text-[10px] rounded-lg transition flex items-center space-x-1 cursor-pointer"
                >
                  <MaterialIcon icon="visibility" size={12} />
                  <span>Try On</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
