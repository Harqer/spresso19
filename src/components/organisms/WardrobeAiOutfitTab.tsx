import React from "react";
import { MaterialIcon } from "../MaterialIcon";
import { GeneratedOutfit } from "../../types";

interface WardrobeAiOutfitTabProps {
  userUploadedItemsCount: number;
  selectedWeatherMode: string;
  temperaturePrompt: string;
  isGeneratingOutfit: boolean;
  currentOutfit: GeneratedOutfit | null;
  onSetWeatherMode: (mode: any) => void;
  onSetTemperaturePrompt: (temp: string) => void;
  onGenerateAIOutfit: (mode: any, temp: string) => void;
  onRandomizeShuffle: (mode: any, temp: string) => void;
  onSaveFavoriteOutfit: (outfit: GeneratedOutfit) => void;
}

const AVATARS: any[] = []; // In original, AVATARS was empty array

export const WardrobeAiOutfitTab: React.FC<WardrobeAiOutfitTabProps> = ({
  userUploadedItemsCount, selectedWeatherMode, temperaturePrompt, isGeneratingOutfit,
  currentOutfit, onSetWeatherMode, onSetTemperaturePrompt, onGenerateAIOutfit,
  onRandomizeShuffle, onSaveFavoriteOutfit
}) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-r from-[#e8f3e8] to-[#f2f8f2] p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[#386633]">
            <MaterialIcon icon="thermostat" size={22} />
            <h3 className="font-bold text-sm text-[#18211e]">Select Current Weather or Season</h3>
          </div>
          <span className="text-[11px] text-[#5e635f] font-mono font-semibold">
            Grounded in your uploaded photo gallery ({userUploadedItemsCount} items)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { mode: "HOT_SUMMER", icon: "wb_sunny", title: "☀️ Hot & Sunny (80°F+)", desc: "Shorts, Linen, Tees, Lightweight Dresses, Sandals", tempDefault: "85°F Sunny & Breezy" },
            { mode: "COLD_WINTER", icon: "ac_unit", title: "❄️ Cold Winter (30°F - 50°F)", desc: "Chunky Sweaters, Wool Coats, Denim, Jackets, Boots", tempDefault: "38°F Chilly Winter Day" },
            { mode: "MILD_SPRING_AUTUMN", icon: "filter_vintage", title: "🍂 Mild Spring / Autumn (60°F - 72°F)", desc: "Layered Cardigans, Jeans, Light Jackets, Sneakers", tempDefault: "64°F Mild Afternoon Breeze" }
          ].map(preset => (
            <button
              key={preset.mode} type="button"
              onClick={() => { onSetWeatherMode(preset.mode); onSetTemperaturePrompt(preset.tempDefault); onGenerateAIOutfit(preset.mode, preset.tempDefault); }}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between space-y-2 ${selectedWeatherMode === preset.mode ? "bg-white border-[#386633] shadow-md ring-2 ring-[#386633]/20" : "bg-white/70 border-[#d8ebd7] hover:bg-white hover:border-[#386633]/50"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#18211e]">{preset.title}</span>
                <MaterialIcon icon={preset.icon} size={18} className="text-[#386633]" />
              </div>
              <p className="text-[11px] text-[#5e635f] leading-snug">{preset.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <MaterialIcon icon="edit_note" size={18} className="absolute left-3.5 top-2.5 text-[#386633]" />
            <input
              type="text" value={temperaturePrompt} onChange={e => onSetTemperaturePrompt(e.target.value)}
              placeholder="E.g. 78°F Beach day or 42°F Evening Dinner..."
              className="w-full bg-white border border-[#d8ebd7] rounded-xl pl-10 pr-3 py-2 text-xs font-semibold text-[#18211e] focus:outline-none focus:border-[#386633]"
            />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button onClick={() => onGenerateAIOutfit(selectedWeatherMode, temperaturePrompt)} disabled={isGeneratingOutfit} className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50">
              {isGeneratingOutfit ? (
                <> <MaterialIcon icon="refresh" size={16} className="animate-spin" /> <span>Synthesizing Outfit...</span> </>
              ) : (
                <> <MaterialIcon icon="auto_awesome" size={16} /> <span>Generate AI Weather Outfit</span> </>
              )}
            </button>
            <button onClick={() => onRandomizeShuffle(selectedWeatherMode, temperaturePrompt)} disabled={isGeneratingOutfit} className="px-3.5 py-2.5 bg-white hover:bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1" title="Randomly shuffle items from your photo gallery">
              <MaterialIcon icon="casino" size={16} /> <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {currentOutfit && (
        <div className="bg-white rounded-3xl border border-[#d8ebd7] shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f2f8f2] pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">{currentOutfit.weatherMatchScore}% Weather Match</span>
                <span className="text-xs text-[#5e635f] font-mono font-semibold">{currentOutfit.temperatureText}</span>
              </div>
              <h3 className="text-lg font-bold text-[#18211e] mt-1 font-headline">{currentOutfit.title}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => onSaveFavoriteOutfit(currentOutfit)} className="px-3 py-1.5 bg-[#e8f3e8] hover:bg-[#386633] text-[#386633] hover:text-white border border-[#d8ebd7] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1">
                <MaterialIcon icon="star" size={15} /> <span>Save to Favorites</span>
              </button>
              <button onClick={() => onRandomizeShuffle(selectedWeatherMode, temperaturePrompt)} className="p-1.5 rounded-xl bg-stone-100 hover:bg-[#e8f3e8] text-[#18211e] transition cursor-pointer" title="Generate another combination">
                <MaterialIcon icon="shuffle" size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-4">
              <h4 className="text-xs font-bold text-[#5e635f] uppercase tracking-wider font-mono">Outfit Clothing Combination ({currentOutfit.items.length} Pieces)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentOutfit.items.map(item => (
                  <div key={item.id} className="bg-[#f9fbf9] p-3 rounded-2xl border border-[#d8ebd7] flex flex-col justify-between space-y-2 group hover:border-[#386633] transition">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-white">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold shadow-xs ${item.type === "user_upload" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {item.type === "user_upload" ? "Gallery Photo" : "Bookmarked Shop"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#386633] uppercase block">{item.category.replace("_", " ")}</span>
                      <h5 className="font-bold text-xs text-[#18211e] line-clamp-1">{item.name}</h5>
                      {item.price && <span className="text-xs font-mono font-bold text-[#386633] block mt-0.5">${item.price.toFixed(2)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-1 text-xs text-[#2d4d29]">
                <div className="flex items-center space-x-1.5 font-bold text-[#386633]"><MaterialIcon icon="psychology" size={16} /> <span>Spresso AI Personal Stylist Notes:</span></div>
                <p className="leading-relaxed text-[#48524d]">{currentOutfit.stylingAdvice}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
