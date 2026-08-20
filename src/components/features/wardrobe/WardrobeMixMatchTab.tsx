import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { CustomWardrobeItem, GeneratedOutfit, WardrobeCategory } from "../../../types";

interface WardrobeMixMatchTabProps {
  mixMatchSlots: Record<string, CustomWardrobeItem | null>;
  setMixMatchSlots: React.Dispatch<React.SetStateAction<Record<string, CustomWardrobeItem | null>>>;
  setSlotDrawerCategory: (cat: WardrobeCategory | null) => void;
  onSaveFavoriteOutfit: (outfit: GeneratedOutfit) => void;
  setActiveTab: (tab: any) => void;
  slotDrawerCategory: WardrobeCategory | null;
  allWardrobeItems: CustomWardrobeItem[];
  wardrobeCategories: string[];
}

export const WardrobeMixMatchTab: React.FC<WardrobeMixMatchTabProps> = ({
  mixMatchSlots, setMixMatchSlots,
  setSlotDrawerCategory, onSaveFavoriteOutfit, setActiveTab,
  slotDrawerCategory, allWardrobeItems, wardrobeCategories
}) => {
  // If backend hasn't loaded them, fallback to local standard
  const activeCategories = wardrobeCategories.length > 0 ? wardrobeCategories : ["TOP", "BOTTOM", "SWEATER_OUTERWEAR", "SHOES", "ACCESSORY", "DRESS"];

  const slots = activeCategories.map(category => ({
    slotLabel: category.replace("_", " "),
    category: category as WardrobeCategory,
    item: mixMatchSlots[category] || null,
    icon: category === "SHOES" ? "roller_skating" : category === "BOTTOM" ? "checkroom" : category === "ACCESSORY" ? "watch" : "apparel"
  }));

  const handleClearAll = () => {
    setMixMatchSlots({});
  };

  const handleRemoveSlot = (cat: string) => {
    setMixMatchSlots(prev => ({ ...prev, [cat]: null }));
  };

  const handleSelectSlot = (cat: string, item: CustomWardrobeItem) => {
    setMixMatchSlots(prev => ({ ...prev, [cat]: item }));
    setSlotDrawerCategory(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#18211e]">Interactive Outfit Mix & Match Canvas</h3>
            <p className="text-xs text-[#5e635f] mt-0.5">Select items from your photo gallery or saved bookmarks to combine into your custom look!</p>
          </div>
          <button onClick={handleClearAll} className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded-xl text-[#5e635f] transition cursor-pointer">
            Clear All Slots
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {slots.map((slot, idx) => (
            <div key={idx} className="bg-[#f9fbf9] p-4 rounded-2xl border border-[#d8ebd7] space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-[#386633]">
                <span className="flex items-center space-x-1"><MaterialIcon icon={slot.icon} size={16} /><span>{slot.slotLabel}</span></span>
                {slot.item && <button onClick={() => handleRemoveSlot(slot.category)} className="text-[10px] text-red-600 hover:underline cursor-pointer">Remove</button>}
              </div>
              {slot.item ? (
                <div className="space-y-2 text-center">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                    <img src={slot.item.image} alt={slot.item.name} className="w-full h-full object-cover" />
                  </div>
                  <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{slot.item.name}</h5>
                </div>
              ) : (
                <button onClick={() => setSlotDrawerCategory(slot.category)} className="w-full aspect-square border-2 border-dashed border-[#d8ebd7] hover:border-[#386633] rounded-xl flex flex-col items-center justify-center text-[#5e635f] hover:text-[#386633] transition cursor-pointer p-3 space-y-1 bg-white/50">
                  <MaterialIcon icon="add_circle_outline" size={24} /> <span className="text-xs font-bold">Pick {slot.slotLabel}</span>
                </button>
              )}
              <button onClick={() => setSlotDrawerCategory(slot.category)} className="w-full py-1.5 bg-white hover:bg-[#e8f3e8] border border-[#d8ebd7] rounded-xl text-xs font-bold text-[#386633] transition cursor-pointer">
                {slot.item ? "Change Item" : "Select Item"}
              </button>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#f2f8f2] flex justify-end">
          <button onClick={() => {
            const items = Object.values(mixMatchSlots).filter(Boolean) as CustomWardrobeItem[];
            if (items.length === 0) return;
            onSaveFavoriteOutfit({
              id: `custom-mix-${Date.now()}`, title: "Personal Mix & Match Outfit", weatherCondition: "MILD_SPRING_AUTUMN",
              temperatureText: "Custom Styling", items, stylingAdvice: "Hand-crafted combination from your personal photo gallery closet.", weatherMatchScore: 98, savedAt: Date.now()
            });
            setActiveTab("SAVED_OUTFITS");
          }} disabled={Object.values(mixMatchSlots).filter(Boolean).length === 0} className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center space-x-2">
            <MaterialIcon icon="bookmark_add" size={16} /> <span>Save Mix & Match Outfit</span>
          </button>
        </div>
      </div>

      {slotDrawerCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-[#d8ebd7] shadow-xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
              <h3 className="font-bold text-base text-[#18211e]">Select {slotDrawerCategory.replace("_", " ")} Item</h3>
              <button onClick={() => setSlotDrawerCategory(null)} className="p-1 text-[#5e635f] hover:text-[#18211e]"><MaterialIcon icon="close" size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-1">
              {allWardrobeItems.filter(i => i.category === slotDrawerCategory).map(item => (
                <button key={item.id} onClick={() => handleSelectSlot(slotDrawerCategory, item)} className="bg-[#f9fbf9] p-3 rounded-2xl border border-[#d8ebd7] hover:border-[#386633] text-left transition cursor-pointer flex flex-col justify-between space-y-2 group">
                  <div className="aspect-square rounded-xl overflow-hidden bg-white border border-[#d8ebd7]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{item.name}</h5>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
