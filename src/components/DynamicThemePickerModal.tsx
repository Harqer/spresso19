import React, { useState, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import {
  SEED_PRESETS,
  generateFiveTonalPalettes,
  generateMaterialScheme,
  applyDynamicThemeToDocument,
  extractSeedColorFromImage,
  FiveTonalPalettes,
  MaterialSchemeTokens,
} from "../lib/dynamicColorEngine";

interface DynamicThemePickerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  currentSeedHex: string;
  currentSecondaryHex?: string;
  currentSecondarySeedHex?: string;
  onSelectSeedHex: (hex: string, secondaryHex?: string) => void;
  mode: "light" | "dark";
  onToggleMode: () => void;
}

export const DynamicThemePickerModal: React.FC<DynamicThemePickerModalProps> = ({
  isOpen,
  onClose,
  currentSeedHex,
  currentSecondaryHex,
  onSelectSeedHex,
  mode,
  onToggleMode,
}) => {
  const [activeTab, setActiveTab] = useState<"PRESETS" | "EXTRACT_IMAGE" | "TONAL_PALETTES" | "SCHEME_TOKENS">("PRESETS");
  const [customHex, setCustomHex] = useState<string>(currentSeedHex);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const palettes: FiveTonalPalettes = generateFiveTonalPalettes(currentSeedHex, currentSecondaryHex);
  const scheme: MaterialSchemeTokens = generateMaterialScheme(palettes, mode);

  const handleApplySeed = (hex: string, secondaryHex?: string) => {
    onSelectSeedHex(hex, secondaryHex);
    applyDynamicThemeToDocument(hex, mode, secondaryHex);
  };

  const handleShuffle = () => {
    const randomColor = "#" + (Date.now() % 16777215).toString(16).padStart(6, "0");
    setCustomHex(randomColor);
    handleApplySeed(randomColor);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const src = evt.target?.result as string;
      setUploadedImagePreview(src);
      const extractedHex = await extractSeedColorFromImage(src);
      setCustomHex(extractedHex);
      handleApplySeed(extractedHex);
      setExtracting(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-3xl border border-[var(--md-sys-color-outline)] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[var(--md-sys-color-surface-container-highest)] border-b border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-md">
              <MaterialIcon icon="palette" size={22} />
            </div>
            <div>
              <h3 className="font-headline text-xl font-bold text-[var(--md-sys-color-on-surface)]">
                Material You Dynamic Color Builder
              </h3>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                Extract colors from wallpapers, derive 13-tone palettes, & apply surface elevations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleMode}
              className="px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] text-xs font-bold flex items-center space-x-1.5 transition hover:opacity-85 cursor-pointer"
              title="Toggle Light / Dark Scheme"
            >
              <MaterialIcon icon={mode === "dark" ? "light_mode" : "dark_mode"} size={16} />
              <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-low)] transition cursor-pointer"
            >
              <MaterialIcon icon="close" size={20} />
            </button>
          </div>
        </div>

        {/* Dynamic Color Banner Preview */}
        <div className="px-6 py-3 bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex flex-wrap items-center justify-between gap-3 text-xs border-b border-[var(--md-sys-color-outline-variant)]">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold">Active Seed:</span>
            <div
              className="w-5 h-5 rounded-md border border-black/20 shadow-xs"
              style={{ backgroundColor: currentSeedHex }}
            />
            <span className="font-mono uppercase font-bold">{currentSeedHex}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShuffle}
              className="px-2.5 py-1 rounded-lg bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold flex items-center space-x-1 cursor-pointer transition hover:opacity-90"
            >
              <MaterialIcon icon="shuffle" size={14} />
              <span>Shuffle Seed</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 bg-[var(--md-sys-color-surface-container)] border-b border-[var(--md-sys-color-outline-variant)] overflow-x-auto no-scrollbar">
          {[
            { id: "PRESETS", label: "🎨 Seed Presets", icon: "palette" },
            { id: "EXTRACT_IMAGE", label: "🖼️ Extract Wallpaper Color", icon: "image" },
            { id: "TONAL_PALETTES", label: "🌈 5 Tonal Palettes", icon: "gradient" },
            { id: "SCHEME_TOKENS", label: "🏛️ Card Elevation Tokens", icon: "layers" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center space-x-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] border-t-2 border-[var(--md-sys-color-primary)] shadow-xs"
                  : "text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
              }`}
            >
              <MaterialIcon icon={tab.icon} size={15} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PRESETS & MANUAL HEX */}
          {activeTab === "PRESETS" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-2">
                  Curated Material You Seed Color Presets
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SEED_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setCustomHex(preset.hex);
                        handleApplySeed(preset.hex, preset.secondaryHex);
                      }}
                      className={`p-3 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                        currentSeedHex.toLowerCase() === preset.hex.toLowerCase()
                          ? "border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] ring-2 ring-[var(--md-sys-color-primary)]"
                          : "border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] hover:border-[var(--md-sys-color-primary)]"
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl shadow-xs border border-black/10 shrink-0"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate">{preset.name}</div>
                        <div className="text-[10px] font-mono opacity-80">{preset.hex}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Input */}
              <div className="p-4 rounded-2xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-3">
                <label className="block text-xs font-bold text-[var(--md-sys-color-on-surface)]">
                  Custom Seed Color Picker or Hex Code
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      handleApplySeed(e.target.value);
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        handleApplySeed(e.target.value);
                      }
                    }}
                    placeholder="#446732"
                    className="px-3 py-2 text-xs font-mono rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-on-surface)] uppercase focus:outline-none focus:ring-2 focus:ring-[var(--md-sys-color-primary)]"
                  />
                  <button
                    onClick={() => handleApplySeed(customHex)}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] transition hover:opacity-90 cursor-pointer"
                  >
                    Apply Theme
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WALLPAPER IMAGE COLOR EXTRACTION */}
          {activeTab === "EXTRACT_IMAGE" && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  Extract Seed Color from Wallpaper Image
                </h4>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                  Upload any wallpaper or moodboard image. Material You will derive the dominant seed hue and extrapolate custom tonal palettes for your UI.
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={extracting}
                    className="px-5 py-3 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs flex items-center space-x-2 transition hover:opacity-90 cursor-pointer shadow-md"
                  >
                    <MaterialIcon icon="upload" size={18} />
                    <span>{extracting ? "Extracting Color..." : "Choose Wallpaper Image"}</span>
                  </button>

                  {uploadedImagePreview && (
                    <div className="flex items-center space-x-3">
                      <img
                        src={uploadedImagePreview}
                        alt="Wallpaper Preview"
                        className="w-16 h-16 object-cover rounded-xl border border-[var(--md-sys-color-outline)] shadow-xs"
                      />
                      <div>
                        <span className="text-[10px] font-mono text-[var(--md-sys-color-on-surface-variant)] block">
                          Extracted Seed Color
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <div
                            className="w-4 h-4 rounded-full border border-black/20"
                            style={{ backgroundColor: currentSeedHex }}
                          />
                          <span className="font-mono text-xs font-bold uppercase">{currentSeedHex}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 5 TONAL PALETTES DISPLAY */}
          {activeTab === "TONAL_PALETTES" && (
            <div className="space-y-5">
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                The seed color is translated into 5 tonal ranges (Primary, Secondary, Tertiary, Neutral, Neutral Variant) spanning 13 luminance tones from 0 (Black) to 100 (White).
              </p>

              {[
                { name: "Primary Tonal Palette", palette: palettes.primary },
                { name: "Secondary Tonal Palette", palette: palettes.secondary },
                { name: "Tertiary Tonal Palette", palette: palettes.tertiary },
                { name: "Neutral Tonal Palette", palette: palettes.neutral },
                { name: "Neutral Variant Tonal Palette", palette: palettes.neutralVariant },
              ].map((p, idx) => (
                <div key={idx} className="space-y-1.5">
                  <h5 className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">
                    {p.name}
                  </h5>
                  <div className="grid grid-cols-13 gap-1 rounded-xl overflow-hidden p-1.5 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]">
                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100].map((tone) => (
                      <div key={tone} className="flex flex-col items-center">
                        <div
                          className="w-full h-8 rounded-md shadow-2xs border border-black/10"
                          style={{ backgroundColor: (p.palette as any)[tone] }}
                          title={`Tone ${tone}: ${(p.palette as any)[tone]}`}
                        />
                        <span className="text-[9px] font-mono mt-1 opacity-70">{tone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CARD ELEVATION & SCHEME TOKENS DEMO */}
          {activeTab === "SCHEME_TOKENS" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)] mb-1">
                  Material 3 Tonal Surface Elevation Levels
                </h4>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mb-4">
                  Cards above the background use tonal surface colors and shadow overlays. Notice how elevation level increases background luminance and shadow depth.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Level 0: Background Surface */}
                  <div className="md3-card-level-0 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--md-sys-color-primary)]">
                        Surface Level 0
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--md-sys-color-surface-variant)] text-[var(--md-sys-color-on-surface-variant)] font-mono">
                        Flat Canvas
                      </span>
                    </div>
                    <h5 className="font-bold text-xs">Baseline Background</h5>
                    <p className="text-[11px] opacity-80">
                      Standard background canvas color without elevation overlay.
                    </p>
                  </div>

                  {/* Level 1: Low Elevation Card */}
                  <div className="md3-card-level-1 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--md-sys-color-primary)]">
                        Surface Level 1
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] font-mono">
                        Low Card
                      </span>
                    </div>
                    <h5 className="font-bold text-xs">Surface Container Low</h5>
                    <p className="text-[11px] opacity-80">
                      Ideal for subtle catalog item cards and list containers above the canvas.
                    </p>
                  </div>

                  {/* Level 2: Standard Elevation Card */}
                  <div className="md3-card-level-2 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--md-sys-color-primary)]">
                        Surface Level 2
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] font-mono">
                        Standard Card
                      </span>
                    </div>
                    <h5 className="font-bold text-xs">Surface Container</h5>
                    <p className="text-[11px] opacity-80">
                      Standard elevation for product catalog items, recipe cards, & chat bubbles.
                    </p>
                  </div>

                  {/* Level 3: High Elevation Card */}
                  <div className="md3-card-level-3 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--md-sys-color-primary)]">
                        Surface Level 3
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)] font-mono">
                        Elevated Card
                      </span>
                    </div>
                    <h5 className="font-bold text-xs">Surface Container High</h5>
                    <p className="text-[11px] opacity-80">
                      Elevated cards, filter toolbars, & interactive dropdown sheets.
                    </p>
                  </div>

                  {/* Level 4: Highest Elevation Modal / Action Card */}
                  <div className="md3-card-level-4 p-4 rounded-2xl space-y-2 col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase text-[var(--md-sys-color-primary)]">
                        Surface Level 4
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-mono">
                        Floating Modal
                      </span>
                    </div>
                    <h5 className="font-bold text-xs">Surface Container Highest</h5>
                    <p className="text-[11px] opacity-80">
                      Used for modal dialogs, drawer menus, and floating action popups.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[var(--md-sys-color-surface-container-highest)] border-t border-[var(--md-sys-color-outline-variant)] flex items-center justify-between text-xs">
          <span className="text-[var(--md-sys-color-on-surface-variant)] font-mono">
            Material 3 Dynamic Theme Generator Engine
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold cursor-pointer transition hover:opacity-90 shadow-xs"
          >
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  );
};
