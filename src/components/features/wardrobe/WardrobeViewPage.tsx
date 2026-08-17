import React, { useState, useEffect, useRef } from "react";
import { ProductItem, HITLPayload, CustomWardrobeItem, GeneratedOutfit } from "../../../types";
import { WardrobeHeaderToolbar } from "@/src/components/features/wardrobe/WardrobeHeaderToolbar";
import { WardrobeItemGrid } from "@/src/components/features/wardrobe/WardrobeItemGrid";
import { WardrobeUploadModal } from "@/src/components/features/wardrobe/WardrobeUploadModal";
import { WardrobeTabChip } from "@/src/components/features/wardrobe/WardrobeTabChip";
import { useWardrobeState } from "../../../hooks/useWardrobeState";
import { useWardrobeInteractions } from "../../../hooks/useWardrobeInteractions";
import { StackedWardrobeDecks } from "../../StackedWardrobeDecks";
import { WardrobeSeasonalTab } from "@/src/components/features/wardrobe/WardrobeSeasonalTab";
import { WardrobeAiOutfitTab } from "@/src/components/features/wardrobe/WardrobeAiOutfitTab";
import { WardrobeMixMatchTab } from "@/src/components/features/wardrobe/WardrobeMixMatchTab";
import { WardrobeLikedTab } from "@/src/components/features/wardrobe/WardrobeLikedTab";
import { WardrobeSavedOutfitsTab } from "@/src/components/features/wardrobe/WardrobeSavedOutfitsTab";
import { MaterialIcon } from "../../MaterialIcon";

interface WardrobeViewProps {
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAskAI?: (text: string, image?: string | null) => void;
}



export const WardrobeViewPage: React.FC<WardrobeViewProps> = ({
  products, onSelectTryOn, onRequestHITLCheckout, onAskAI
}) => {
  const state = useWardrobeState(products, onRequestHITLCheckout);
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const interactions = useWardrobeInteractions(state.allWardrobeItems, state.setUserUploadedItems, setCurrentOutfit);
  const [selectedRollItemIds, setSelectedRollItemIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [galleryPieces, setGalleryPieces] = useState<any[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (rawDataUrl) {
          const newItem = {
            id: `local-file-${Date.now()}-${Math.random()}`,
            name: file.name.replace(/\.[^/.]+$/, ""),
            category: "TOP" as const,
            weatherSuitability: "ALL_WEATHER" as const,
            image: rawDataUrl,
            brand: "Local Gallery",
            price: 0
          };
          setGalleryPieces(prev => [...prev, newItem]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    if (!currentOutfit && state.allWardrobeItems.length > 0) interactions.handleGenerateAIOutfit("COLD_WINTER", "38°F Chilly Winter Day");
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleImportItem = (item: any) => {
    const isAlreadyImported = state.userUploadedItems.some(i => i.id === `imported-${item.id}`);
    if (isAlreadyImported) {
      showToast(`${item.name} is already imported!`);
      return;
    }
    const newItem: CustomWardrobeItem = {
      id: `imported-${item.id}`,
      type: "user_upload",
      name: item.name,
      category: item.category,
      weatherSuitability: item.weatherSuitability,
      image: item.image,
      brand: item.brand,
      price: item.price,
      addedAt: Date.now()
    };
    state.setUserUploadedItems(prev => [newItem, ...prev]);
    showToast(`Successfully imported ${item.name} into your Closet!`);
  };

  const handleStyleSelectedOutfit = () => {
    const selectedItems = galleryPieces.filter(item => selectedRollItemIds.includes(item.id))
      .map(item => ({
        id: `imported-${item.id}`,
        type: "user_upload",
        name: item.name,
        category: item.category,
        weatherSuitability: item.weatherSuitability,
        image: item.image,
        brand: item.brand,
        price: item.price,
        addedAt: Date.now()
      }));

    if (selectedItems.length === 0) {
      showToast("Please select at least one garment from your phone gallery to style.");
      return;
    }

    // Auto-import selected items that aren't already imported
    state.setUserUploadedItems(prev => {
      const filteredNew = selectedItems.filter(si => !prev.some(p => p.id === si.id));
      return [...filteredNew, ...prev];
    });

    // Populate mix & match slots based on categories
    const top = selectedItems.find(i => i.category === "TOP");
    const bottom = selectedItems.find(i => i.category === "BOTTOM");
    const outer = selectedItems.find(i => i.category === "SWEATER_OUTERWEAR");
    const shoes = selectedItems.find(i => i.category === "SHOES");

    if (top) interactions.setMixMatchTop(top);
    if (bottom) interactions.setMixMatchBottom(bottom);
    if (outer) interactions.setMixMatchOuter(outer);
    if (shoes) interactions.setMixMatchShoes(shoes);

    showToast(`Assembled outfit with ${selectedItems.length} items. Opening Mix & Match Studio!`);
    state.setActiveTab("MIX_MATCH");
    setSelectedRollItemIds([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        if (rawDataUrl) {
          interactions.setUploadPreview(rawDataUrl);
          if (!interactions.uploadTitle) interactions.setUploadTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFavoriteOutfit = (outfit: GeneratedOutfit) => {
    if (!state.savedFavoriteOutfits.some(o => o.id === outfit.id)) state.setSavedFavoriteOutfits(prev => [outfit, ...prev]);
  };

  const tabs = [
    { id: "STACKED_DECKS", label: "Stacked Deck Fan-Out Fits", count: state.allWardrobeItems.length + state.likedProducts.length },
    { id: "SEASONAL", label: "Seasonal Collections", count: state.allWardrobeItems.length },
    { id: "BOOKMARKS", label: "Saved Catalog Bookmarks", count: state.bookmarkedWardrobeItems.length },
    { id: "LIKED", label: "Liked Items", count: state.likedProducts.length },
    { id: "AI_OUTFIT", label: "AI Weather Generator", count: currentOutfit ? 1 : 0 },
    { id: "MIX_MATCH", label: "Mix & Match Studio", count: null },
    { id: "ALL", label: "All Closet Items", count: state.allWardrobeItems.length },
    { id: "PHOTO_GALLERY", label: "Photo Gallery Uploads", count: state.userUploadedItems.length },
    { id: "SAVED_OUTFITS", label: "Favorite Outfits", count: state.savedFavoriteOutfits.length }
  ] as const;

  return (
    <div className="space-y-6 pb-12 relative">
      {toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-[#386633] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center space-x-1.5">
          <MaterialIcon icon="check_circle" size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {state.photoGalleryPermission !== "GRANTED" && (state.activeTab === "PHOTO_GALLERY" || state.photoGalleryPermission === "UNDETERMINED") && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-[#d8ebd7] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <MaterialIcon icon="photo_library" size={32} />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold font-headline text-[#18211e]">
                Sync Personal Photo Gallery
              </h3>
              <p className="text-xs text-[#5e635f] leading-relaxed">
                Allow Spresso to sync with your photo gallery to automatically detect, import, and organize your physical garments. This enables Spresso's AI to style custom personal outfits for summer, winter, and other seasonal collections.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => state.grantGalleryPermission()}
                className="w-full py-3 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
              >
                <MaterialIcon icon="sync" size={16} />
                <span>Allow & Sync Gallery</span>
              </button>
              
              <button
                onClick={() => state.denyGalleryPermission()}
                className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-[#5e635f] rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Deny Access
              </button>
            </div>
          </div>
        </div>
      )}

      <WardrobeHeaderToolbar itemCount={state.allWardrobeItems.length} onOpenUploadModal={() => interactions.setShowUploadModal(true)} onSelectAiGenerator={() => state.setActiveTab("AI_OUTFIT")} />
      
      <div className="flex items-center space-x-2 border-b border-[#d8ebd7] pb-2 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <WardrobeTabChip key={tab.id} id={tab.id} label={tab.label} count={tab.count} isActive={state.activeTab === tab.id} onClick={() => state.setActiveTab(tab.id as any)} />
        ))}
      </div>

      {state.activeTab === "STACKED_DECKS" && <StackedWardrobeDecks userUploadedItems={state.userUploadedItems} bookmarkedItems={state.bookmarkedWardrobeItems} likedProducts={state.likedProducts} products={products} onSelectTryOn={onSelectTryOn} onRequestHITLCheckout={onRequestHITLCheckout} onOpenUploadModal={() => interactions.setShowUploadModal(true)} onSaveFavoriteOutfit={handleSaveFavoriteOutfit} />}
      {state.activeTab === "SEASONAL" && <WardrobeSeasonalTab allWardrobeItems={state.allWardrobeItems} products={products} onSelectTryOn={onSelectTryOn} onGoToMixMatch={() => state.setActiveTab("MIX_MATCH")} />}
      {state.activeTab === "AI_OUTFIT" && <WardrobeAiOutfitTab userUploadedItemsCount={state.userUploadedItems.length} selectedWeatherMode={interactions.selectedWeatherMode} temperaturePrompt={interactions.temperaturePrompt} isGeneratingOutfit={interactions.isGeneratingOutfit} currentOutfit={currentOutfit} onSetWeatherMode={interactions.setSelectedWeatherMode} onSetTemperaturePrompt={interactions.setTemperaturePrompt} onGenerateAIOutfit={interactions.handleGenerateAIOutfit} onRandomizeShuffle={interactions.handleGenerateAIOutfit} onSaveFavoriteOutfit={handleSaveFavoriteOutfit} />}
      {state.activeTab === "MIX_MATCH" && <WardrobeMixMatchTab mixMatchTop={interactions.mixMatchTop} mixMatchBottom={interactions.mixMatchBottom} mixMatchOuter={interactions.mixMatchOuter} mixMatchShoes={interactions.mixMatchShoes} setMixMatchTop={interactions.setMixMatchTop} setMixMatchBottom={interactions.setMixMatchBottom} setMixMatchOuter={interactions.setMixMatchOuter} setMixMatchShoes={interactions.setMixMatchShoes} setSlotDrawerCategory={interactions.setSlotDrawerCategory} onSaveFavoriteOutfit={handleSaveFavoriteOutfit} setActiveTab={state.setActiveTab} slotDrawerCategory={interactions.slotDrawerCategory} allWardrobeItems={state.allWardrobeItems} />}
      
      {state.activeTab === "PHOTO_GALLERY" && state.photoGalleryPermission === "DENIED" && (
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

      {state.activeTab === "PHOTO_GALLERY" && state.photoGalleryPermission === "GRANTED" && (
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
                const isImported = state.userUploadedItems.some(i => i.id === `imported-${item.id}`);
                return (
                  <div key={item.id} className="relative bg-[#f9fbf9] p-2 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] transition flex flex-col justify-between space-y-2 group shadow-2xs">
                    {/* Checkbox select */}
                    <button
                      onClick={() => {
                        setSelectedRollItemIds(prev =>
                          prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
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

      {(state.activeTab === "ALL" || state.activeTab === "BOOKMARKS") && <WardrobeItemGrid items={state.filteredItems} products={products} selectedCategory={state.selectedCategory} selectedWeatherFilter={state.selectedWeatherFilter} onSelectCategory={state.setSelectedCategory} onSelectWeatherFilter={state.setSelectedWeatherFilter} onDeleteItem={state.handleDeleteItem} onCheckoutProduct={state.handleCheckoutProduct} onOpenUploadModal={() => interactions.setShowUploadModal(true)} />}
      {state.activeTab === "LIKED" && <WardrobeLikedTab likedProducts={state.likedProducts} setLikedProducts={state.setLikedProducts} onSelectTryOn={onSelectTryOn} onCheckoutProduct={state.handleCheckoutProduct} />}
      {state.activeTab === "SAVED_OUTFITS" && <WardrobeSavedOutfitsTab savedFavoriteOutfits={state.savedFavoriteOutfits} setSavedFavoriteOutfits={state.setSavedFavoriteOutfits} />}
      {interactions.showUploadModal && <WardrobeUploadModal uploadPreview={interactions.uploadPreview} uploadTitle={interactions.uploadTitle} uploadCategory={interactions.uploadCategory} uploadWeather={interactions.uploadWeather} uploadColor={interactions.uploadColor} onSetUploadTitle={interactions.setUploadTitle} onSetUploadCategory={interactions.setUploadCategory} onSetUploadWeather={interactions.setUploadWeather} onSetUploadColor={interactions.setUploadColor} onSetUploadPreview={interactions.setUploadPreview} onFileChange={handleFileChange} onClose={() => interactions.setShowUploadModal(false)} onSave={interactions.handleSaveUploadedItem} />}
    </div>
  );
};
