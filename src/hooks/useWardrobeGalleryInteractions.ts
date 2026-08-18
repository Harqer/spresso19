import { useState, useRef } from "react";
import { CustomWardrobeItem, GeneratedOutfit } from "../../../types";

export function useWardrobeGalleryInteractions(
  state: any,
  interactions: any
) {
  const [selectedRollItemIds, setSelectedRollItemIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [galleryPieces, setGalleryPieces] = useState<any[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

  const handleImportItem = (item: any) => {
    const isAlreadyImported = state.userUploadedItems.some((i: any) => i.id === `imported-${item.id}`);
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
    state.setUserUploadedItems((prev: any) => [newItem, ...prev]);
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
    state.setUserUploadedItems((prev: any) => {
      const filteredNew = selectedItems.filter(si => !prev.some((p: any) => p.id === si.id));
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
    if (!state.savedFavoriteOutfits.some((o: any) => o.id === outfit.id)) state.setSavedFavoriteOutfits((prev: any) => [outfit, ...prev]);
  };

  return {
    selectedRollItemIds,
    setSelectedRollItemIds,
    toastMessage,
    galleryPieces,
    galleryInputRef,
    handleGalleryFiles,
    handleImportItem,
    handleStyleSelectedOutfit,
    handleFileChange,
    handleSaveFavoriteOutfit
  };
}
