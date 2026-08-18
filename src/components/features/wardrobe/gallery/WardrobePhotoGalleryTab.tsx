import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { WardrobeItemGrid } from "../WardrobeItemGrid";

interface WardrobePhotoGalleryTabProps {
  state: any;
  interactions: any;
  products: any[];
  onAskAI?: (text: string, image?: string | null) => void;
  selectedRollItemIds: string[];
  setSelectedRollItemIds: React.Dispatch<React.SetStateAction<string[]>>;
  galleryPieces: any[];
  galleryInputRef: React.RefObject<HTMLInputElement>;
  handleGalleryFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleStyleSelectedOutfit: () => void;
  handleImportItem: (item: any) => void;
}

export const WardrobePhotoGalleryTab: React.FC<WardrobePhotoGalleryTabProps> = ({
  state, interactions, products, onAskAI,
  selectedRollItemIds, setSelectedRollItemIds,
  galleryPieces, galleryInputRef,
  handleGalleryFiles, handleStyleSelectedOutfit, handleImportItem
}) => {
  return (
    <>
      {state.photoGalleryPermission === "DENIED" && (
        <div className="bg-white p-8 rounded-3xl border border-[#d8ebd7] text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <MaterialIcon icon="lock" size={24} />
          </div>
          <h3 className="text-sm font-bold text-[#18211e]">Gallery Sync Disabled</h3>
          <p className="text-xs text-[#5e635f] max-w-sm mx-auto">
            Please allow access to your device photo gallery to synchronize and style your physical clothing items.
          </p>
          <button
            onClick={() => state.grantGalleryPermission()}
            className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold mx-auto cursor-pointer"
          >
            Allow Access & Sync
          </button>
        </div>
      )}

      {state.photoGalleryPermission === "GRANTED" && (
        <div className="space-y-6 animate-fadeIn">
          {/* User Media Gallery Camera Roll Section */}
          <div className="bg-white p-5 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#18211e] font-headline flex items-center space-x-1.5">
                  <MaterialIcon icon="photo_library" size={18} className="text-[#386633]" />
                  <span>Synced Device Photo Gallery Roll</span>
                </h3>
                <p className="text-[11px] text-[#5e635f] mt-0.5">
                  Tap items to import to closet, or select multiple garments and click "Stylize Outfit" for custom styling.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                {selectedRollItemIds.length > 0 && (
                  <button
                    onClick={handleStyleSelectedOutfit}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-[#386633] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <MaterialIcon icon="style" size={16} />
                    <span>Stylize Selected Outfit ({selectedRollItemIds.length})</span>
                  </button>
                )}
                <button onClick={() => onAskAI?.("What outfits can I create from my photo gallery?", null)} className="px-4 py-2 bg-[#e8f3e8] text-[#386633] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer">
                  <MaterialIcon icon="auto_awesome" size={16} />
                  <span>Ask AI</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="flex items-center justify-center border-2 border-dashed border-[#d8ebd7] rounded-2xl min-h-[120px] bg-white hover:bg-[#f9fbf9] cursor-pointer" onClick={() => galleryInputRef.current?.click()}>
                <input type="file" multiple accept="image/*" ref={galleryInputRef} onChange={handleGalleryFiles} className="hidden" />
                <div className="text-center space-y-2">
                  <MaterialIcon icon="add_photo_alternate" size={24} className="text-[#386633] mx-auto" />
                  <span className="text-[10px] font-bold text-[#386633] uppercase">Select Photos</span>
                </div>
              </div>
              {galleryPieces.map(item => {
                const isSelected = selectedRollItemIds.includes(item.id);
                const isImported = state.userUploadedItems.some((i: any) => i.id === `imported-${item.id}`);
                return (
                  <div key={item.id} className="relative bg-[#f9fbf9] p-2 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] transition flex flex-col justify-between space-y-2 group shadow-2xs">
                    {/* Checkbox select */}
                    <button
                      onClick={() => {
                        setSelectedRollItemIds((prev: any) =>
                          prev.includes(item.id) ? prev.filter((id: any) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md flex items-center justify-center border transition ${
                        isSelected ? "bg-[#386633] border-[#386633] text-white" : "bg-white/80 border-[#d8ebd7] text-transparent hover:border-[#386633]"
                      }`}
                    >
                      <MaterialIcon icon="check" size={12} />
                    </button>

                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      {isImported && (
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-[#386633] text-white">
                          Imported
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-[9px] font-mono font-bold text-[#386633] uppercase block">
                        {item.category.replace("_", " ")}
                      </span>
                      <h5 className="font-bold text-[11px] text-[#18211e] line-clamp-1">{item.name}</h5>
                    </div>

                    <button
                      onClick={() => handleImportItem(item)}
                      className={`w-full py-1 rounded-lg text-[10px] font-bold transition cursor-pointer text-center ${
                        isImported
                          ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                          : "bg-[#e8f3e8] text-[#386633] hover:bg-[#386633] hover:text-white"
                      }`}
                      disabled={isImported}
                    >
                      {isImported ? "In Closet" : "Import & Style"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Imported Gallery Items Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#5e635f] uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <MaterialIcon icon="checkroom" size={16} className="text-[#386633]" />
              <span>Personal Closet (Imported Photo Uploads)</span>
            </h4>
            <WardrobeItemGrid
              items={state.userUploadedItems}
              products={products}
              selectedCategory={state.selectedCategory}
              selectedWeatherFilter={state.selectedWeatherFilter}
              onSelectCategory={state.setSelectedCategory}
              onSelectWeatherFilter={state.setSelectedWeatherFilter}
              onDeleteItem={state.handleDeleteItem}
              onCheckoutProduct={state.handleCheckoutProduct}
              onOpenUploadModal={() => interactions.setShowUploadModal(true)}
            />
          </div>
        </div>
      )}
    </>
  );
};
