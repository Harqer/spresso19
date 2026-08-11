import React from "react";
import { MaterialIcon } from "../MaterialIcon";

interface WardrobeHeaderToolbarProps {
  itemCount: number;
  onOpenUploadModal: () => void;
  onSelectAiGenerator: () => void;
}

export const WardrobeHeaderToolbar: React.FC<WardrobeHeaderToolbarProps> = ({ 
  itemCount, 
  onOpenUploadModal, 
  onSelectAiGenerator 
}) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div className="flex items-center space-x-3.5">
        <div className="p-3.5 bg-[#e8f3e8] border border-[#d8ebd7] rounded-2xl text-[#386633] shadow-xs shrink-0">
          <MaterialIcon icon="checkroom" size={28} />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-[#18211e] font-headline">My Smart Wardrobe & Camera Gallery</h2>
            <span className="px-2.5 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded-full border border-[#d8ebd7]">
              {itemCount} Closet Items
            </span>
          </div>
          <p className="text-xs text-[#5e635f] mt-0.5">
            Snap personal clothes from your camera photo gallery & save catalog bookmarks. AI generates weather-smart outfits automatically!
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={onOpenUploadModal}
          className="px-4 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-2"
        >
          <MaterialIcon icon="add_a_photo" size={16} />
          <span>Add Personal Clothes</span>
        </button>

        <button
          onClick={onSelectAiGenerator}
          className="px-4 py-2.5 bg-[#e8f3e8] hover:bg-[#d8ebd7] text-[#386633] border border-[#386633]/30 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
        >
          <MaterialIcon icon="auto_awesome" size={16} />
          <span>AI Weather Generator</span>
        </button>
      </div>
    </div>
  );
};
