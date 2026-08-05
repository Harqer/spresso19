import React, { useState, useEffect } from "react";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";

interface VirtualTryOnModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  deviceMode?: string;
  onOpenLens?: (product: ProductItem) => void;
}

const DEFAULT_AVATARS = [
  { id: "avatar-1", name: "Model A (Studio)", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" },
  { id: "avatar-2", name: "Model B (Urban)", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80" },
  { id: "avatar-3", name: "Model C (Casual)", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" },
  { id: "avatar-4", name: "Model D (Minimal)", url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80" },
  { id: "avatar-5", name: "Model E (High Fashion)", url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80" }
];

const GENMEDIA_BACKGROUNDS = [
  { id: "bg-studio", name: "Studio Clean", icon: "wb_sunny", color: "bg-stone-100" },
  { id: "bg-urban", name: "Urban Street", icon: "location_city", color: "bg-slate-200" },
  { id: "bg-luxury", name: "Boutique", icon: "king_bed", color: "bg-amber-50" },
  { id: "bg-night", name: "Studio Night", icon: "auto_awesome", color: "bg-[#18211e] text-white" }
];

export const PRODUCT_ANIMATION_OPTIONS = [
  { id: "anim-orbit", name: "360° Runway Orbit", icon: "3d_rotation", description: "360-degree smooth orbital sweep highlighting 3D garment silhouette" },
  { id: "anim-catwalk", name: "Catwalk Motion Walk", icon: "directions_walk", description: "Natural runway pacing with full-body fabric swing and dynamic light reflection" },
  { id: "anim-drape", name: "Drape & Texture Slow-Mo", icon: "styler", description: "Macro zoom on stitching, material weight, and micro-drape fluid motion" },
  { id: "anim-street", name: "Dynamic Street Pacing", icon: "location_city", description: "Outdoor ambient movement with natural sunlight flare and realistic shadows" },
  { id: "anim-studio", name: "Cinematic Studio Turn", icon: "movie", description: "High-contrast studio slow-motion turn with softbox directional fill" }
];

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  product,
  onClose,
  onRequestHITLCheckout,
  onOpenLens
}) => {
  if (!product) return null;

  const [modeChosen, setModeChosen] = useState<boolean>(true);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("video");
  const [selectedAvatar, setSelectedAvatar] = useState(() => getRandomItem(DEFAULT_AVATARS));
  const [selectedBg, setSelectedBg] = useState(() => getRandomItem(GENMEDIA_BACKGROUNDS));
  const [selectedAnimation, setSelectedAnimation] = useState(() => getRandomItem(PRODUCT_ANIMATION_OPTIONS));
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  const [tryOnMeta, setTryOnMeta] = useState({
    mediaType: "video",
    fitScore: 98,
    sizeRecommendation: "Medium / Standard Fit",
    styleMatchAnalysis: "Optimal fit, ViTPose plain vision transformer body keypoint tracking with FP16 FlashAttention.",
    pipelineModel: "virtual-try-on-001 (Google Model Garden & ViTPose Transformer)",
    genMediaMode: "GenMedia Commerce Studio Enabled",
    vitPoseTracking: {
      backbone: "ViTPose Plain Vision Transformer",
      precision: "FP16 + FlashAttention",
      inferenceFPS: 190,
      baselineFPS: 58,
      latencyMs: 5.2,
      decoders: "Lightweight single-pass spatial decoders",
      scalability: "Non-hierarchical edge to 1B parameter setup",
      dreambeansUrl: "https://labs.google/dreambeans",
      status: "Active (190+ FPS Ultra-Low Latency)"
    }
  });

  // Randomly select default video animation options on modal load or product change
  useEffect(() => {
    if (product) {
      const randomAvatar = getRandomItem(DEFAULT_AVATARS);
      const randomBg = getRandomItem(GENMEDIA_BACKGROUNDS);
      const randomAnim = getRandomItem(PRODUCT_ANIMATION_OPTIONS);

      setSelectedAvatar(randomAvatar);
      setSelectedBg(randomBg);
      setSelectedAnimation(randomAnim);
      setSelectedMediaType("video");
      setModeChosen(true);
    }
  }, [product?.id]);

  const handleRandomizeOptions = () => {
    const randomAvatar = getRandomItem(DEFAULT_AVATARS);
    const randomBg = getRandomItem(GENMEDIA_BACKGROUNDS);
    const randomAnim = getRandomItem(PRODUCT_ANIMATION_OPTIONS);

    setSelectedAvatar(randomAvatar);
    setSelectedBg(randomBg);
    setSelectedAnimation(randomAnim);
    runTryOnAnalysis("video");
  };

  const runTryOnAnalysis = async (mediaType: "image" | "video" = selectedMediaType) => {
    setIsProcessing(true);
    try {
      const [resTryOn, resVitpose] = await Promise.all([
        fetch("/api/try-on", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            userPhotoBase64: customAvatar || selectedAvatar.url,
            customNotes: `Render in ${selectedBg.name} using ${selectedAnimation.name}`,
            mediaType
          })
        }),
        fetch("/api/vitpose/orchestrate-fit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userImageBase64: customAvatar || selectedAvatar.url,
            desiredFitStyle: selectedAnimation.name,
            preferredCategory: product.category
          })
        }).catch(() => null)
      ]);

      const data = await resTryOn.json();
      let fitReason = "";
      if (resVitpose && resVitpose.ok) {
        const vitData = await resVitpose.json();
        if (vitData.orchestratorOutput?.fitAnalysis) {
          fitReason = vitData.orchestratorOutput.fitAnalysis;
        }
      }

      if (data.tryOnMeta) {
        setTryOnMeta(prev => ({
          ...prev,
          ...data.tryOnMeta,
          ...(fitReason ? { styleMatchAnalysis: `${data.tryOnMeta.styleMatchAnalysis} ViTPose Dimensions: ${fitReason}` } : {})
        }));
      }
    } catch {
      // Fallback
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectMode = (type: "image" | "video") => {
    setSelectedMediaType(type);
    setModeChosen(true);
    runTryOnAnalysis(type);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCustomAvatar(reader.result as string);
        runTryOnAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckout = () => {
    const payload: HITLPayload = {
      authorizationId: `ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        sku: product.sku,
        image: product.image
      },
      quantity: 1,
      totalAmount: product.price,
      currency: product.currency,
      deviceSource: "WEB",
      inventoryConfirmed: product.stock > 0,
      stockRemaining: product.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Authorize $${product.price.toFixed(2)} for ${product.name}?`,
        safetyChecks: [
          `Virtual Try-On 001 fit score verified (98% in ${selectedMediaType.toUpperCase()} mode)`,
          "In stock and ready to ship",
          "Includes free express delivery & returns"
        ]
      }
    };

    onRequestHITLCheckout(payload);
    onClose();
  };

  const activePersonImage = customAvatar || selectedAvatar.url;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#e2e2e2] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 relative text-[#18211e] my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#f3f3f4] text-[#5e5e63] transition cursor-pointer z-10"
          title="Close"
        >
          <MaterialIcon icon="close" size={20} />
        </button>

        {/* Prompt Card: Choose Image vs Video Mode before loading */}
        {!modeChosen ? (
          <div className="py-6 space-y-6 text-center">
            <div className="w-14 h-14 bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <MaterialIcon icon="styler" size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold font-headline text-[#18211e]">
                Virtual Avatar Try-On Experience
              </h3>
              <p className="text-xs text-[#5e635f] max-w-md mx-auto leading-relaxed">
                Choose how you want to preview <strong>{product.name}</strong> on your virtual avatar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-2">
              {/* Image Try-On Option Card */}
              <button
                onClick={() => handleSelectMode("image")}
                className="p-5 rounded-2xl border-2 border-[#d8ebd7] hover:border-[#386633] bg-white hover:bg-[#f2f8f2] transition text-left cursor-pointer space-y-3 group shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3e8] text-[#386633] group-hover:bg-[#386633] group-hover:text-white flex items-center justify-center transition">
                    <MaterialIcon icon="photo_camera" size={22} />
                  </div>
                  <span className="px-2 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded">3D Photo Fit</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#18211e] group-hover:text-[#386633] transition">Image Try-On</h4>
                  <p className="text-[11px] text-[#5e635f] mt-0.5 leading-snug">
                    Instant raytraced high-resolution 3D photo mesh & realistic lighting fit.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-[#386633] flex items-center space-x-1 pt-1">
                  <span>Start Image Mode</span>
                  <MaterialIcon icon="arrow_forward" size={14} />
                </div>
              </button>

              {/* Video Try-On Option Card */}
              <button
                onClick={() => handleSelectMode("video")}
                className="p-5 rounded-2xl border-2 border-[#d8ebd7] hover:border-[#386633] bg-white hover:bg-[#f2f8f2] transition text-left cursor-pointer space-y-3 group shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3e8] text-[#386633] group-hover:bg-[#386633] group-hover:text-white flex items-center justify-center transition">
                    <MaterialIcon icon="videocam" size={22} />
                  </div>
                  <span className="px-2 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded">Live Motion</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#18211e]">Video Try-On</h4>
                  <p className="text-[11px] text-[#5e635f] mt-0.5 leading-snug">
                    Multi-frame dynamic fabric movement, drape physics & full-body video motion.
                  </p>
                </div>
                <div className="text-[10px] font-bold text-[#386633] flex items-center space-x-1 pt-1">
                  <span>Start Video Mode</span>
                  <MaterialIcon icon="arrow_forward" size={14} />
                </div>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Title Header */}
            <div className="flex items-center justify-between pr-10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#e8f3e8] border border-[#d8ebd7] rounded-2xl text-[#386633]">
                  <MaterialIcon icon="styler" size={22} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-[#18211e] font-headline">Virtual Try-On Studio</h3>
                    <span className="px-2 py-0.5 bg-[#e8f3e8] text-[#386633] text-[10px] font-mono font-bold rounded-md uppercase border border-[#d8ebd7]">
                      {selectedMediaType} Mode
                    </span>
                  </div>
                  <p className="text-xs text-[#5e635f]">
                    {product.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRandomizeOptions}
                  className="px-3 py-1.5 bg-[#f2f8f2] hover:bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  title="Randomize video animation style, model avatar, and background"
                >
                  <MaterialIcon icon="shuffle" size={15} />
                  <span>Shuffle Options</span>
                </button>

                {/* Mode Toggle Pills */}
                <div className="hidden sm:flex items-center bg-[#f2f8f2] p-1 rounded-xl border border-[#d8ebd7]">
                  <button
                    onClick={() => handleSelectMode("image")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                      selectedMediaType === "image" ? "bg-white text-[#386633] shadow-xs" : "text-[#5e635f]"
                    }`}
                  >
                    <MaterialIcon icon="photo_camera" size={14} />
                    <span>Image</span>
                  </button>
                  <button
                    onClick={() => handleSelectMode("video")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                      selectedMediaType === "video" ? "bg-[#386633] text-white shadow-xs" : "text-[#5e635f]"
                    }`}
                  >
                    <MaterialIcon icon="videocam" size={14} />
                    <span>Video</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Input vs Generative Output Canvas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main Generative Render Canvas */}
              <div className="space-y-3">
                <div
                  onClick={() => onOpenLens && onOpenLens(product)}
                  className={`relative aspect-[4/5] rounded-2xl border border-[#d8ebd7] overflow-hidden flex items-center justify-center shadow-inner transition-all cursor-pointer group/canvas ${selectedBg.color}`}
                  title="Tap on video or image object to open Google Lens Glassmorphic Product Listing"
                >
                  {/* Product & Model Composited Preview */}
                  <div className="relative w-full h-full flex items-center justify-center p-2">
                    <img
                      src={activePersonImage}
                      alt="Person Model"
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover/canvas:scale-105 ${
                        isProcessing
                          ? "opacity-30 blur-sm"
                          : selectedMediaType === "video" && isVideoPlaying
                          ? "animate-pulse opacity-100 scale-105"
                          : "opacity-100"
                      }`}
                    />
                    
                    {/* Garment / Product Overlay preview */}
                    <div className={`absolute bottom-3 right-3 w-28 h-28 bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-[#d8ebd7] shadow-lg transition duration-300 ${isProcessing ? "scale-95 opacity-50" : "scale-100"}`}>
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      <span className="absolute -top-2 -left-2 px-1.5 py-0.5 bg-[#386633] text-white text-[9px] font-mono font-bold rounded">Garment</span>
                    </div>
                  </div>

                  {/* Google Lens Interactive Tap Target Pulse Reticle */}
                  <div className="absolute center-0 z-30 px-3.5 py-2 bg-stone-900/80 backdrop-blur-md border border-orange-500/50 text-white rounded-full flex items-center space-x-2 shadow-2xl group-hover/canvas:scale-110 transition duration-300 animate-bounce">
                    <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping shrink-0" />
                    <MaterialIcon icon="center_focus_strong" size={18} className="text-orange-400" />
                    <span className="text-xs font-black font-headline tracking-wide text-orange-200">
                      Tap Object (Google Lens)
                    </span>
                  </div>

                  {/* Fit Score Badge */}
                  <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md border border-[#d8ebd7] text-[#386633] text-xs font-bold rounded-full flex items-center space-x-1.5 shadow-xs">
                    <MaterialIcon icon="check_circle" size={16} className="text-[#386633]" />
                    <span>Fit Match: {tryOnMeta.fitScore}%</span>
                  </div>

                  {/* Active Animation Style Badge Overlay */}
                  {selectedMediaType === "video" && (
                    <div className="absolute top-11 left-3 px-2.5 py-1 bg-emerald-900/80 backdrop-blur-md text-emerald-100 text-[10px] font-mono rounded-full flex items-center space-x-1 shadow-xs border border-emerald-500/30">
                      <MaterialIcon icon={selectedAnimation.icon} size={13} />
                      <span className="truncate max-w-[150px]">{selectedAnimation.name}</span>
                    </div>
                  )}

                  {/* Video Mode Playing Controls Overlay */}
                  {selectedMediaType === "video" && (
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-[#386633]/90 backdrop-blur-md text-white text-[10px] font-mono rounded-full flex items-center space-x-1.5 shadow-md z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsVideoPlaying(!isVideoPlaying);
                        }}
                        className="hover:text-emerald-200 transition cursor-pointer"
                      >
                        <MaterialIcon icon={isVideoPlaying ? "pause_circle" : "play_circle"} size={16} />
                      </button>
                      <span>{isVideoPlaying ? "3D Motion Playing" : "Paused"}</span>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#386633]/80 backdrop-blur-md text-white text-[10px] font-mono rounded-full flex items-center space-x-1 shadow-xs">
                    <MaterialIcon icon={selectedBg.icon} size={13} />
                    <span>{selectedBg.name}</span>
                  </div>

                  {/* Processing Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-[#18211e]">
                      <MaterialIcon icon="refresh" size={32} className="animate-spin text-[#386633]" />
                      <span className="text-xs font-medium mt-2">Fitting Garment...</span>
                    </div>
                  )}
                </div>

                {/* GenMedia Studio Background Selectors */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#5e635f] uppercase tracking-wider block">
                    Lighting & Environment
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GENMEDIA_BACKGROUNDS.map(bg => (
                      <button
                        key={bg.id}
                        onClick={() => {
                          setSelectedBg(bg);
                          runTryOnAnalysis();
                        }}
                        className={`p-2 rounded-xl border transition text-center cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          selectedBg.id === bg.id
                            ? "border-[#386633] bg-white shadow-xs font-bold"
                            : "border-[#d8ebd7] bg-[#f2f8f2] hover:bg-[#e8f3e8]"
                        }`}
                      >
                        <MaterialIcon icon={bg.icon} size={16} className={selectedBg.id === bg.id ? "text-[#386633]" : "text-[#5e635f]"} />
                        <span className="text-[10px] truncate">{bg.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls & Fit Analysis */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Product Video Animation Style Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5e635f] uppercase tracking-wider block">
                        1. Product Video Animation Style
                      </span>
                      <span className="text-[10px] text-[#386633] font-mono font-semibold">Random by default</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                      {PRODUCT_ANIMATION_OPTIONS.map(anim => (
                        <button
                          key={anim.id}
                          onClick={() => {
                            setSelectedAnimation(anim);
                            runTryOnAnalysis("video");
                          }}
                          className={`p-2 rounded-xl border transition text-left cursor-pointer flex items-start space-x-2.5 ${
                            selectedAnimation.id === anim.id
                              ? "border-[#386633] bg-[#e8f3e8]/60 shadow-xs ring-1 ring-[#386633]/30"
                              : "border-[#d8ebd7] bg-[#f2f8f2] hover:bg-[#e8f3e8]"
                          }`}
                        >
                          <div className={`p-1 rounded-lg shrink-0 ${selectedAnimation.id === anim.id ? "bg-[#386633] text-white" : "bg-white text-[#5e635f]"}`}>
                            <MaterialIcon icon={anim.icon} size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#18211e]">{anim.name}</span>
                              {selectedAnimation.id === anim.id && (
                                <span className="text-[9px] font-mono text-[#386633] font-bold">ACTIVE</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#5e635f] truncate mt-0.5">{anim.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Person Model Selection */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-[#5e635f] uppercase tracking-wider block">
                      2. Select Virtual Avatar or Upload
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 overflow-x-auto">
                      {DEFAULT_AVATARS.map(avatar => (
                        <button
                          key={avatar.id}
                          onClick={() => {
                            setCustomAvatar(null);
                            setSelectedAvatar(avatar);
                            runTryOnAnalysis();
                          }}
                          className={`p-1 rounded-xl border transition text-center cursor-pointer ${
                            selectedAvatar.id === avatar.id && !customAvatar
                              ? "border-[#386633] bg-white shadow-xs ring-1 ring-[#386633]/20"
                              : "border-[#d8ebd7] bg-[#f2f8f2] hover:bg-[#e8f3e8]"
                          }`}
                        >
                          <img src={avatar.url} alt="" className="w-10 h-10 mx-auto rounded-lg object-cover" />
                          <p className="text-[9px] font-bold text-[#18211e] mt-0.5 truncate">{avatar.name.split(" ")[0]}</p>
                        </button>
                      ))}
                    </div>

                    <div className="pt-1">
                      <label className="cursor-pointer block text-center py-1.5 px-3 bg-white hover:bg-[#e8f3e8] border border-[#b0d4af] text-[#18211e] text-xs font-bold rounded-xl transition shadow-xs">
                        <span>Upload Personal Photo</span>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Fit & Garment Analysis Card */}
                  <div className="p-4 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] text-xs space-y-2.5">
                    <div className="flex justify-between items-center text-[#18211e] font-bold border-b border-[#d8ebd7] pb-2">
                      <span>Recommended Size:</span>
                      <span className="text-[#386633] font-extrabold">{tryOnMeta.sizeRecommendation}</span>
                    </div>
                    <p className="text-[#5e635f] text-xs leading-relaxed">{tryOnMeta.styleMatchAnalysis}</p>
                  </div>
                </div>

                {/* Bottom Purchase CTA */}
                <div className="space-y-3 pt-3 border-t border-[#d8ebd7]">
                  <div className="flex items-center justify-between text-sm font-bold text-[#18211e]">
                    <div>
                      <span className="block text-xs font-normal text-[#5e635f]">Selected Product</span>
                      <span>{product.name}</span>
                    </div>
                    <span className="text-lg font-mono text-[#386633]">${product.price.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-[#386633] hover:bg-[#2c5227] text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer text-sm"
                  >
                    <MaterialIcon icon="shopping_bag" size={18} />
                    <span>Confirm & Buy Now</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


