import React, { useRef } from "react";
import { MaterialIcon } from "../MaterialIcon";
import { WardrobeCategory, WeatherSuitability } from "../../types";

interface WardrobeUploadModalProps {
  uploadPreview: string | null;
  uploadTitle: string;
  uploadCategory: WardrobeCategory;
  uploadWeather: WeatherSuitability;
  uploadColor: string;
  onSetUploadTitle: (val: string) => void;
  onSetUploadCategory: (val: WardrobeCategory) => void;
  onSetUploadWeather: (val: WeatherSuitability) => void;
  onSetUploadColor: (val: string) => void;
  onSetUploadPreview: (val: string | null) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSave: () => void;
}

export const WardrobeUploadModal: React.FC<WardrobeUploadModalProps> = ({
  uploadPreview,
  uploadTitle,
  uploadCategory,
  uploadWeather,
  uploadColor,
  onSetUploadTitle,
  onSetUploadCategory,
  onSetUploadWeather,
  onSetUploadColor,
  onSetUploadPreview,
  onFileChange,
  onClose,
  onSave
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-[#d8ebd7] shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
          <div className="flex items-center space-x-2 text-[#386633]">
            <MaterialIcon icon="add_a_photo" size={22} />
            <h3 className="font-bold text-base text-[#18211e]">Add Personal Clothing Item</h3>
          </div>
          <button
            onClick={() => { onClose(); onSetUploadPreview(null); }}
            className="p-1 text-[#5e635f] hover:text-[#18211e] cursor-pointer"
          >
            <MaterialIcon icon="close" size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {uploadPreview ? (
            <div className="relative aspect-square w-48 mx-auto rounded-2xl overflow-hidden border border-[#d8ebd7] shadow-xs">
              <img src={uploadPreview} alt="Upload Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => onSetUploadPreview(null)}
                className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-black cursor-pointer"
              >
                <MaterialIcon icon="close" size={16} />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#d8ebd7] hover:border-[#386633] rounded-2xl p-6 text-center space-y-3 transition bg-[#f9fbf9]">
              <div className="w-12 h-12 bg-[#e8f3e8] text-[#386633] rounded-full flex items-center justify-center mx-auto">
                <MaterialIcon icon="camera_alt" size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#18211e]">Snap Photo or Pick from Gallery</p>
                <p className="text-[11px] text-[#5e635f]">Upload shirts, sweaters, jeans, shoes or jackets from your closet</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-4 py-2 bg-[#386633] text-white rounded-xl text-xs font-bold hover:bg-[#2c5227] transition cursor-pointer flex items-center space-x-1"
                >
                  <MaterialIcon icon="photo_camera" size={16} />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-[#386633] border border-[#d8ebd7] hover:bg-[#e8f3e8] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1"
                >
                  <MaterialIcon icon="photo_library" size={16} />
                  <span>Photo Gallery</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          )}

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-[#18211e] mb-1">Item Title / Name</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={e => onSetUploadTitle(e.target.value)}
                placeholder="E.g. Vintage Wool Sweater or Summer Shorts"
                className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#386633]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#18211e] mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={e => onSetUploadCategory(e.target.value as any)}
                  className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#386633]"
                >
                  <option value="TOP">Top / Shirt</option>
                  <option value="BOTTOM">Bottom / Pants</option>
                  <option value="SWEATER_OUTERWEAR">Sweater / Outerwear</option>
                  <option value="DRESS">Dress</option>
                  <option value="SHOES">Shoes / Footwear</option>
                  <option value="ACCESSORY">Accessory</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18211e] mb-1">Suitable Weather</label>
                <select
                  value={uploadWeather}
                  onChange={e => onSetUploadWeather(e.target.value as any)}
                  className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#386633]"
                >
                  <option value="HOT_SUMMER">☀️ Hot / Summer</option>
                  <option value="COLD_WINTER">❄️ Cold / Winter</option>
                  <option value="MILD_SPRING_AUTUMN">🍂 Mild Spring/Autumn</option>
                  <option value="ALL_WEATHER">🌈 All Weathers</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#18211e] mb-1">Color / Tone (Optional)</label>
              <input
                type="text"
                value={uploadColor}
                onChange={e => onSetUploadColor(e.target.value)}
                placeholder="E.g. Beige, Navy Blue, Black"
                className="w-full bg-[#f9fbf9] border border-[#d8ebd7] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#386633]"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#f2f8f2] flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-xs font-bold rounded-xl text-[#5e635f] cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={!uploadPreview}
            className="px-5 py-2 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Save to Personal Closet
          </button>
        </div>
      </div>
    </div>
  );
};
