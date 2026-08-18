import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";

interface WardrobePermissionModalProps {
  onGrant: () => void;
  onDeny: () => void;
}

export const WardrobePermissionModal: React.FC<WardrobePermissionModalProps> = ({ onGrant, onDeny }) => {
  return (
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
            onClick={onGrant}
            className="w-full py-3 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
          >
            <MaterialIcon icon="sync" size={16} />
            <span>Allow & Sync Gallery</span>
          </button>
          
          <button
            onClick={onDeny}
            className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-[#5e635f] rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Deny Access
          </button>
        </div>
      </div>
    </div>
  );
};
