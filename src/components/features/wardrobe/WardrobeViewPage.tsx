import React, { useState, useEffect, useRef } from "react";
import { ProductItem, HITLPayload, CustomWardrobeItem, GeneratedOutfit } from "../../../types";
import { WardrobeHeaderToolbar } from "@/src/components/features/wardrobe/WardrobeHeaderToolbar";
import { WardrobeItemGrid } from "@/src/components/features/wardrobe/WardrobeItemGrid";
import { WardrobeUploadModal } from "@/src/components/features/wardrobe/WardrobeUploadModal";
import { WardrobeTabChip } from "@/src/components/features/wardrobe/WardrobeTabChip";
import { useWardrobeState } from "../../../hooks/useWardrobeState";
import { useWardrobeInteractions } from "../../../hooks/useWardrobeInteractions";
import { useWardrobeGalleryInteractions } from "../../../hooks/useWardrobeGalleryInteractions";
import { StackedWardrobeDecks } from "../../StackedWardrobeDecks";
import { WardrobeSeasonalTab } from "@/src/components/features/wardrobe/WardrobeSeasonalTab";
import { WardrobeAiOutfitTab } from "@/src/components/features/wardrobe/WardrobeAiOutfitTab";
import { WardrobeMixMatchTab } from "@/src/components/features/wardrobe/WardrobeMixMatchTab";
import { WardrobeLikedTab } from "@/src/components/features/wardrobe/WardrobeLikedTab";
import { WardrobeSavedOutfitsTab } from "@/src/components/features/wardrobe/WardrobeSavedOutfitsTab";
import { WardrobePhotoGalleryTab } from "@/src/components/features/wardrobe/gallery/WardrobePhotoGalleryTab";
import { WardrobePermissionModal } from "@/src/components/features/wardrobe/modals/WardrobePermissionModal";
import { MaterialIcon } from "../../MaterialIcon";

interface WardrobeViewProps {
  products: ProductItem[];
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAskAI?: (text: string, image?: string | null) => void;
  userLocation?: string | null;
  userLatLng?: { lat: number; lng: number } | null;
}



export const WardrobeViewPage: React.FC<WardrobeViewProps> = ({
  products, onSelectTryOn, onRequestHITLCheckout, onAskAI, userLocation, userLatLng
}) => {
  const state = useWardrobeState(products, onRequestHITLCheckout);
  const [currentOutfit, setCurrentOutfit] = useState<GeneratedOutfit | null>(null);
  const interactions = useWardrobeInteractions(state.allWardrobeItems, state.setUserUploadedItems, setCurrentOutfit, userLocation, userLatLng);
  const galleryInteractions = useWardrobeGalleryInteractions(state, interactions);

  useEffect(() => {
    if (!currentOutfit && state.allWardrobeItems.length > 0) interactions.handleGenerateAIOutfit("COLD_WINTER", "38°F Chilly Winter Day");
  }, []);

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
      {galleryInteractions.toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-[#386633] text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center space-x-1.5">
          <MaterialIcon icon="check_circle" size={16} />
          <span>{galleryInteractions.toastMessage}</span>
        </div>
      )}

      {state.photoGalleryPermission !== "GRANTED" && (state.activeTab === "PHOTO_GALLERY" || state.photoGalleryPermission === "UNDETERMINED") && (
        <WardrobePermissionModal
          onGrant={() => state.grantGalleryPermission()}
          onDeny={() => state.denyGalleryPermission()}
        />
      )}

      <WardrobeHeaderToolbar itemCount={state.allWardrobeItems.length} onOpenUploadModal={() => interactions.setShowUploadModal(true)} onSelectAiGenerator={() => state.setActiveTab("AI_OUTFIT")} />
      
      <div className="flex items-center space-x-2 border-b border-[#d8ebd7] pb-2 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <WardrobeTabChip key={tab.id} id={tab.id} label={tab.label} count={tab.count} isActive={state.activeTab === tab.id} onClick={() => state.setActiveTab(tab.id as any)} />
        ))}
      </div>

      {state.activeTab === "STACKED_DECKS" && <StackedWardrobeDecks userUploadedItems={state.userUploadedItems} bookmarkedItems={state.bookmarkedWardrobeItems} likedProducts={state.likedProducts} products={products} onSelectTryOn={onSelectTryOn} onRequestHITLCheckout={onRequestHITLCheckout} onOpenUploadModal={() => interactions.setShowUploadModal(true)} onSaveFavoriteOutfit={galleryInteractions.handleSaveFavoriteOutfit} />}
      {state.activeTab === "SEASONAL" && <WardrobeSeasonalTab allWardrobeItems={state.allWardrobeItems} products={products} onSelectTryOn={onSelectTryOn} onGoToMixMatch={() => state.setActiveTab("MIX_MATCH")} />}
      {state.activeTab === "AI_OUTFIT" && <WardrobeAiOutfitTab userUploadedItemsCount={state.userUploadedItems.length} selectedWeatherMode={interactions.selectedWeatherMode} temperaturePrompt={interactions.temperaturePrompt} isGeneratingOutfit={interactions.isGeneratingOutfit} currentOutfit={currentOutfit} onSetWeatherMode={interactions.setSelectedWeatherMode} onSetTemperaturePrompt={interactions.setTemperaturePrompt} onGenerateAIOutfit={interactions.handleGenerateAIOutfit} onRandomizeShuffle={interactions.handleGenerateAIOutfit} onSaveFavoriteOutfit={galleryInteractions.handleSaveFavoriteOutfit} />}
      {state.activeTab === "MIX_MATCH" && <WardrobeMixMatchTab mixMatchTop={interactions.mixMatchTop} mixMatchBottom={interactions.mixMatchBottom} mixMatchOuter={interactions.mixMatchOuter} mixMatchShoes={interactions.mixMatchShoes} setMixMatchTop={interactions.setMixMatchTop} setMixMatchBottom={interactions.setMixMatchBottom} setMixMatchOuter={interactions.setMixMatchOuter} setMixMatchShoes={interactions.setMixMatchShoes} setSlotDrawerCategory={interactions.setSlotDrawerCategory} onSaveFavoriteOutfit={galleryInteractions.handleSaveFavoriteOutfit} setActiveTab={state.setActiveTab} slotDrawerCategory={interactions.slotDrawerCategory} allWardrobeItems={state.allWardrobeItems} />}
      
      {state.activeTab === "PHOTO_GALLERY" && (
        <WardrobePhotoGalleryTab
          state={state}
          interactions={interactions}
          products={products}
          onAskAI={onAskAI}
          selectedRollItemIds={galleryInteractions.selectedRollItemIds}
          setSelectedRollItemIds={galleryInteractions.setSelectedRollItemIds}
          galleryPieces={galleryInteractions.galleryPieces}
          galleryInputRef={galleryInteractions.galleryInputRef}
          handleGalleryFiles={galleryInteractions.handleGalleryFiles}
          handleStyleSelectedOutfit={galleryInteractions.handleStyleSelectedOutfit}
          handleImportItem={galleryInteractions.handleImportItem}
        />
      )}

      {(state.activeTab === "ALL" || state.activeTab === "BOOKMARKS") && <WardrobeItemGrid items={state.filteredItems} products={products} selectedCategory={state.selectedCategory} selectedWeatherFilter={state.selectedWeatherFilter} onSelectCategory={state.setSelectedCategory} onSelectWeatherFilter={state.setSelectedWeatherFilter} onDeleteItem={state.handleDeleteItem} onCheckoutProduct={state.handleCheckoutProduct} onOpenUploadModal={() => interactions.setShowUploadModal(true)} />}
      {state.activeTab === "LIKED" && <WardrobeLikedTab likedProducts={state.likedProducts} setLikedProducts={state.setLikedProducts} onSelectTryOn={onSelectTryOn} onCheckoutProduct={state.handleCheckoutProduct} />}
      {state.activeTab === "SAVED_OUTFITS" && <WardrobeSavedOutfitsTab savedFavoriteOutfits={state.savedFavoriteOutfits} setSavedFavoriteOutfits={state.setSavedFavoriteOutfits} />}
      {interactions.showUploadModal && <WardrobeUploadModal uploadPreview={interactions.uploadPreview} uploadTitle={interactions.uploadTitle} uploadCategory={interactions.uploadCategory} uploadWeather={interactions.uploadWeather} uploadColor={interactions.uploadColor} onSetUploadTitle={interactions.setUploadTitle} onSetUploadCategory={interactions.setUploadCategory} onSetUploadWeather={interactions.setUploadWeather} onSetUploadColor={interactions.setUploadColor} onSetUploadPreview={interactions.setUploadPreview} onFileChange={galleryInteractions.handleFileChange} onClose={() => interactions.setShowUploadModal(false)} onSave={interactions.handleSaveUploadedItem} />}
    </div>
  );
};
