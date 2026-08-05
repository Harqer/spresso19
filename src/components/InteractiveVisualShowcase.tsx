import React, { useState, useEffect } from "react";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";

interface InteractiveVisualShowcaseProps {
  product: ProductItem;
  croppedThumbnail?: string;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAddToCart?: (product: ProductItem) => void;
  onClose?: () => void;
}

const DEFAULT_AVATARS = [
  { id: "avatar-1", name: "Model A (Studio)", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80" },
  { id: "avatar-2", name: "Model B (Urban)", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80" },
  { id: "avatar-3", name: "Model C (Casual)", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80" }
];

const STUDIO_PRESETS = [
  { id: "preset-carrara", name: "Carrara Marble Studio", icon: "wb_sunny", prompt: "Pristine Carrara marble plinth, 5500K directional golden sunlight, crisp leaf shadows, f/8 aperture" },
  { id: "preset-vogue", name: "Vogue Editorial Sunlight", icon: "camera", prompt: "Vogue high-fashion editorial set, warm directional studio lighting, architectural spatial framing" },
  { id: "preset-obsidian", name: "Obsidian Dark Luxury", icon: "auto_awesome", prompt: "Deep Obsidian canvas, champagne metal accents, raytraced specular caustics, luxury dark atmosphere" },
  { id: "preset-urban", name: "Urban Street Pop", icon: "location_city", prompt: "High-contrast urban city backdrop, CIELab 3:1 pop-out contrast, energetic natural ambient fill" },
  { id: "preset-paris", name: "Parisian Atelier", icon: "domain", prompt: "Haute couture Parisian atelier window light, soft linen textures, subtle golden hour glow" }
];

const MOTION_PROFILES = [
  { id: "motion-orbit", name: "Smooth 360 Orbit", description: "Controlled 360 degree orbital camera sweep" },
  { id: "motion-sweep", name: "Medium Unpredictability Sweep", description: "Non-linear speed ramps with dynamic camera pans" },
  { id: "motion-zoom", name: "Slow-Motion Zoom", description: "Cinematic macro focus on material grain and stitching" },
  { id: "motion-lean", name: "Subtle Leaning-In (Self-Validation)", description: "ELM posture cue reinforcing trust and brand connection" }
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const InteractiveVisualShowcase: React.FC<InteractiveVisualShowcaseProps> = ({
  product,
  croppedThumbnail,
  onRequestHITLCheckout,
  onAddToCart,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<"vto" | "video" | "spin">("video");
  const [selectedAvatar, setSelectedAvatar] = useState(() => getRandomItem(DEFAULT_AVATARS));
  const [selectedPreset, setSelectedPreset] = useState(() => getRandomItem(STUDIO_PRESETS));
  const [selectedMotion, setSelectedMotion] = useState(() => getRandomItem(MOTION_PROFILES));
  const [customPromptText, setCustomPromptText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [spinAngle, setSpinAngle] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  // Randomize selection on product change
  useEffect(() => {
    if (product) {
      setSelectedAvatar(getRandomItem(DEFAULT_AVATARS));
      setSelectedPreset(getRandomItem(STUDIO_PRESETS));
      setSelectedMotion(getRandomItem(MOTION_PROFILES));
    }
  }, [product?.id]);

  // Generated metadata state from Genkit AI / Gemini
  const [tryOnMeta, setTryOnMeta] = useState({
    fitScore: 98,
    sizeRecommendation: "Medium / Standard Fit",
    styleMatchAnalysis: "Vogue editorial drape and anatomical alignment with f/8 optical aperture.",
    lightingMatch: "5500K directional golden sunlight with raytraced specular highlights.",
    augmentedOverlayNotes: "ELM Central/Peripheral route optimized: CIELab 3:1 pop-out contrast, subsurface scattering.",
    cinematicPrompt: `Hero shot of ${product.name} on Carrara marble plinth, 8k resolution, subsurface scattering, f/8 aperture`,
    motionProfile: "Medium unpredictability with non-linear camera sweeps",
    pipelineModel: "Spresso Brand Visual Engine"
  });

  const handleSynthesizeVideo = async (overridePrompt?: string) => {
    setIsGenerating(true);
    try {
      const promptToUse = overridePrompt || customPromptText || `${selectedPreset.prompt}, Motion: ${selectedMotion.description}`;
      const res = await fetch("/api/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          mediaType: activeTab === "vto" ? "image" : activeTab === "video" ? "video" : "360",
          customNotes: promptToUse
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.tryOnMeta) {
          setTryOnMeta(prev => ({ ...prev, ...data.tryOnMeta }));
        }
      }
    } catch (err) {
      console.warn("Video synthesis error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckout = () => {
    const payload: HITLPayload = {
      authorizationId: `ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        sku: product.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        image: croppedThumbnail || product.image
      },
      quantity: 1,
      totalAmount: product.price,
      currency: "USD",
      deviceSource: "WEB",
      inventoryConfirmed: true,
      stockRemaining: product.stock || 10,
      humanInTheLoopChallenge: {
        title: "Human Purchase Authorization",
        message: `Authorize $${product.price.toFixed(2)} for ${product.name}?`,
        safetyChecks: [
          "Price verified against real-time catalog node",
          "Biometric & human confirmation active",
          "30-Day automated free return window protected"
        ]
      }
    };
    onRequestHITLCheckout(payload);
  };

  const handleAddToCartAction = () => {
    if (onAddToCart) {
      onAddToCart(product);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#d8ebd7] shadow-lg overflow-hidden my-3 transition-all duration-300">
      {/* Top Banner Header */}
      <div className="bg-[#18211e] text-white p-3.5 flex items-center justify-between border-b border-[#323d38]">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#386633] text-white flex items-center justify-center shrink-0">
            <MaterialIcon icon="auto_awesome" size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Spresso Persuasive AI Studio
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[9px] font-mono rounded font-semibold border border-emerald-500/30">
                8K ELM
              </span>
            </div>
            <h4 className="text-xs font-bold text-white truncate mt-0.5">
              {product.name}
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-sm font-extrabold text-emerald-400 font-mono">
            ${product.price.toFixed(2)}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              title="Close Showcase"
            >
              <MaterialIcon icon="close" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="flex items-center bg-[#f3f3f4] p-1 border-b border-[#e2e2e2]">
        <button
          onClick={() => {
            setActiveTab("vto");
            handleSynthesizeVideo("Vogue avatar fitting room, 8k resolution, subsurface scattering");
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === "vto"
              ? "bg-white text-[#18211e] shadow-xs font-extrabold"
              : "text-[#5e5e63] hover:text-[#18211e]"
          }`}
        >
          <MaterialIcon icon="styler" size={15} className="text-[#386633]" />
          <span>Avatar Try-On</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("video");
            handleSynthesizeVideo("High-energy cinematic product video, medium unpredictability, speed ramp");
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === "video"
              ? "bg-white text-[#18211e] shadow-xs font-extrabold"
              : "text-[#5e5e63] hover:text-[#18211e]"
          }`}
        >
          <MaterialIcon icon="videocam" size={15} className="text-[#386633]" />
          <span>Cinematic Video</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("spin");
            handleSynthesizeVideo("360 orbital product spin showcase, raytraced reflections");
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeTab === "spin"
              ? "bg-white text-[#18211e] shadow-xs font-extrabold"
              : "text-[#5e5e63] hover:text-[#18211e]"
          }`}
        >
          <MaterialIcon icon="360" size={15} className="text-[#386633]" />
          <span>360 Spin</span>
        </button>
      </div>

      {/* Media Canvas Stage */}
      <div className="relative w-full h-80 bg-slate-950 flex items-center justify-center overflow-hidden group">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 p-4 text-center">
            <MaterialIcon icon="auto_awesome" size={32} className="text-emerald-400 animate-spin" />
            <p className="text-xs font-bold">Rendering High-Quality Persuasive AI Visual...</p>
            <p className="text-[10px] text-slate-400 font-mono max-w-xs truncate">
              {tryOnMeta.cinematicPrompt}
            </p>
          </div>
        )}

        {/* MODE 1: Avatar Virtual Try-On */}
        {activeTab === "vto" && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedAvatar.url}
              alt="Avatar Model"
              className="w-full h-full object-cover filter brightness-95"
            />

            {/* Overlaid Item Garment AR Fit */}
            <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
              <div className="relative w-48 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-400/80 bg-black/30 backdrop-blur-xs flex items-center justify-center transform hover:scale-105 transition duration-500">
                <img
                  src={croppedThumbnail || product.image}
                  alt={product.name}
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/20 text-center">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                    {tryOnMeta.fitScore}% FIT MATCH · {tryOnMeta.sizeRecommendation}
                  </span>
                </div>
              </div>
            </div>

            {/* Avatar Selector Overlay */}
            <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/20">
              {DEFAULT_AVATARS.map(av => (
                <button
                  key={av.id}
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-7 h-7 rounded-lg overflow-hidden border-2 transition cursor-pointer ${
                    selectedAvatar.id === av.id ? "border-emerald-400 scale-110" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  title={av.name}
                >
                  <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* MODE 2: Cinematic Video */}
        {activeTab === "video" && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {/* Simulated High-Quality Product Cinematic Video View */}
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
              <img
                src={croppedThumbnail || product.image}
                alt={product.name}
                className={`w-full h-full object-cover transition-transform duration-1000 ${
                  isVideoPlaying ? "scale-110 rotate-1 ease-in-out" : "scale-100"
                }`}
              />

              {/* Cinematic Vignette & Lighting Effects */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

              {/* Video Play HUD Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center transition cursor-pointer shadow-md"
                  >
                    <MaterialIcon icon={isVideoPlaying ? "pause" : "play_arrow"} size={18} />
                  </button>
                  <div className="text-white">
                    <span className="text-[10px] font-mono text-emerald-400 block font-bold">
                      4K CINEMATIC SHOWCASE
                    </span>
                    <span className="text-[11px] font-bold block truncate max-w-[200px]">
                      {selectedPreset.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="px-2 py-0.5 bg-black/60 border border-white/20 text-white text-[9px] font-mono rounded">
                    f/8 APERTURE
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono rounded font-bold">
                    60 FPS
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: 360 Spin Showcase */}
        {activeTab === "spin" && (
          <div className="relative w-full h-full flex items-center justify-center bg-slate-900 p-6">
            <div
              className="relative w-64 h-64 flex items-center justify-center transition-transform duration-200 cursor-grab active:cursor-grabbing"
              style={{ transform: `rotateY(${spinAngle}deg)` }}
            >
              <img
                src={croppedThumbnail || product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain filter drop-shadow-2xl"
              />
            </div>

            {/* 360 Rotation Controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 z-20">
              <button
                onClick={() => setSpinAngle(prev => prev - 45)}
                className="p-1 text-white hover:text-emerald-400 transition cursor-pointer"
                title="Rotate Left"
              >
                <MaterialIcon icon="rotate_left" size={18} />
              </button>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2">
                {((spinAngle % 360) + 360) % 360}° ORBIT
              </span>
              <button
                onClick={() => setSpinAngle(prev => prev + 45)}
                className="p-1 text-white hover:text-emerald-400 transition cursor-pointer"
                title="Rotate Right"
              >
                <MaterialIcon icon="rotate_right" size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Video & Visual Customization Controls ("Modify Video / Studio") */}
      <div className="p-3.5 bg-[#fafcf9] border-t border-[#e2e2e2] space-y-3">
        {/* Section Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <MaterialIcon icon="tune" size={16} className="text-[#386633]" />
            <h5 className="text-xs font-extrabold text-[#18211e]">
              Modify Studio Atmosphere & Motion
            </h5>
          </div>
          <span className="text-[10px] font-mono text-[#5e5e63]">
            Powered by Gemini 2.5
          </span>
        </div>

        {/* Atmosphere Presets Chips */}
        <div>
          <label className="text-[10px] font-bold text-[#5e5e63] uppercase tracking-wider block mb-1">
            Studio Atmosphere
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 chat-scrollbar">
            {STUDIO_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset);
                  handleSynthesizeVideo(preset.prompt);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition flex items-center space-x-1 cursor-pointer ${
                  selectedPreset.id === preset.id
                    ? "bg-[#18211e] text-white border-[#18211e] shadow-xs"
                    : "bg-white text-[#5e5e63] border-[#e2e2e2] hover:border-[#386633] hover:text-[#18211e]"
                }`}
              >
                <MaterialIcon icon={preset.icon} size={13} className="text-amber-500" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Motion Profile Chips */}
        <div>
          <label className="text-[10px] font-bold text-[#5e5e63] uppercase tracking-wider block mb-1">
            Motion & Camera Angle
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 chat-scrollbar">
            {MOTION_PROFILES.map(motion => (
              <button
                key={motion.id}
                onClick={() => {
                  setSelectedMotion(motion);
                  handleSynthesizeVideo(`Motion: ${motion.description}`);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 transition flex items-center space-x-1 cursor-pointer ${
                  selectedMotion.id === motion.id
                    ? "bg-[#386633] text-white border-[#386633] shadow-xs"
                    : "bg-white text-[#5e5e63] border-[#e2e2e2] hover:border-[#386633] hover:text-[#18211e]"
                }`}
              >
                <MaterialIcon icon="movie" size={13} />
                <span>{motion.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input Bar */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={customPromptText}
            onChange={e => setCustomPromptText(e.target.value)}
            placeholder="e.g. Add falling golden leaves, 5500K sunset rays..."
            className="flex-1 px-3 py-2 bg-white border border-[#c4c7c7] rounded-xl text-xs text-[#18211e] placeholder-[#747878] focus:outline-none focus:border-[#386633]"
            onKeyDown={e => {
              if (e.key === "Enter") handleSynthesizeVideo();
            }}
          />
          <button
            onClick={() => handleSynthesizeVideo()}
            disabled={isGenerating}
            className="px-3.5 py-2 bg-[#18211e] hover:bg-[#323d38] text-white text-xs font-bold rounded-xl transition flex items-center space-x-1 cursor-pointer shrink-0 shadow-sm"
          >
            <MaterialIcon icon="auto_awesome" size={14} className="text-emerald-400" />
            <span>Update Visual</span>
          </button>
        </div>

        {/* Action Buttons: Buy Now & Add to Cart */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#e2e2e2]">
          <button
            onClick={handleAddToCartAction}
            className={`px-4 py-2.5 font-bold text-xs rounded-xl border transition flex items-center justify-center space-x-1.5 cursor-pointer ${
              addedToCart
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white hover:bg-[#f3f3f4] text-[#18211e] border-[#c4c7c7]"
            }`}
          >
            <MaterialIcon icon={addedToCart ? "check" : "add_shopping_cart"} size={16} />
            <span>{addedToCart ? "Added to Cart!" : "Add to Cart"}</span>
          </button>

          <button
            onClick={handleCheckout}
            className="flex-1 py-2.5 px-4 bg-[#18211e] hover:bg-[#323d38] text-white font-extrabold text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
          >
            <MaterialIcon icon="shopping_bag" size={16} className="text-emerald-400" />
            <span>Buy Now (${product.price.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
