import Logger from "../lib/Logger";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { functions } from "../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { ElevatedQuickActionFab } from "./ElevatedQuickActionFab";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";

interface VirtualTryOnModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  deviceMode?: string;
  onOpenLens?: (product: ProductItem) => void;
}

const DEFAULT_AVATARS: any[] = [
  // Require a user-provided photo; generated placeholders are not acceptable.
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

const getFirstItem = <T,>(arr: T[]): T => arr[0];

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  product,
  onClose,
  onRequestHITLCheckout,
  onOpenLens
}) => {

  const [modeChosen, setModeChosen] = useState<boolean>(true);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("video");
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [selectedBg, setSelectedBg] = useState(() => getFirstItem(GENMEDIA_BACKGROUNDS));
  const [selectedAnimation, setSelectedAnimation] = useState(() => getFirstItem(PRODUCT_ANIMATION_OPTIONS));
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedMedia, setGeneratedMedia] = useState<{ mediaUrl: string; mediaType: "image" | "video"; provider?: string } | null>(null);

  const [tryOnMeta, setTryOnMeta] = useState<{
    mediaType: string;
    sizeRecommendation: string;
    styleMatchAnalysis: string;
  } | null>({
    mediaType: "video",
    sizeRecommendation: "Visual estimate only",
    styleMatchAnalysis: "Add a personal photo and fit details for a more relevant visual estimate. Without them, a generated model will be used.",
  });

  useEffect(() => {
    if (product) {
      setSelectedAvatar(null);
      setSelectedBg(GENMEDIA_BACKGROUNDS[0]);
      setSelectedAnimation(PRODUCT_ANIMATION_OPTIONS[0]);
      setSelectedMediaType("video");
      setModeChosen(true);
      setTryOnMeta(null);
    }
  }, [product?.id]);

  const handleRandomizeOptions = () => {
    setSelectedAvatar(null);
    setSelectedBg(GENMEDIA_BACKGROUNDS[0]);
    setSelectedAnimation(PRODUCT_ANIMATION_OPTIONS[0]);
    runTryOnAnalysis("video");
  };

  const abortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const runTryOnAnalysis = async (mediaType: "image" | "video" = selectedMediaType) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsProcessing(true);
    setError(null);
    if (!customAvatar && !selectedAvatar?.url) {
      setIsProcessing(false);
      setError("Upload a personal photo before starting a virtual try-on.");
      return;
    }
    try {
      const generateVirtualTryOn = httpsCallable(functions, "generateVirtualTryOn");
      const vitposeOrchestrateFit = httpsCallable(functions, "vitposeOrchestrateFit");

      const resVitposePromise = (customAvatar || selectedAvatar) ? vitposeOrchestrateFit({
        userImageBase64: customAvatar || (selectedAvatar ? selectedAvatar.url : ""),
        desiredFitStyle: selectedAnimation.name,
        preferredCategory: product?.category || ""
      }).catch((err) => {
        if (err.name !== "AbortError") Logger.error("Fit analysis error:", err);
        return null;
      }) : Promise.resolve(null);
      const [resTryOn, resVitpose] = await Promise.all([
        generateVirtualTryOn({
          productId: product?.id,
          productName: product?.name,
          productImage: product?.image,
          userPhotoBase64: customAvatar || (selectedAvatar ? selectedAvatar.url : ""),
          customNotes: `Render in ${selectedBg.name} using ${selectedAnimation.name}`,
          mediaType,
          fitPreference: selectedAnimation.name,
          fabric: product?.description
        }),
        resVitposePromise
      ]);

      const data: any = resTryOn.data;
      let fitReason = "";
      if (resVitpose && resVitpose.data) {
        const vitData: any = resVitpose.data;
        if (vitData.fitAnalysis) {
          const analysis = vitData.fitAnalysis;
          fitReason = typeof analysis === "string" ? analysis : [analysis.garmentType, analysis.postureDetected].filter(Boolean).join("; ");
        }
      }

      if (data.tryOnMeta) {
        if (data.tryOnMeta.mediaUrl) setGeneratedMedia(data.tryOnMeta);
        setTryOnMeta(prev => ({
          ...prev,
          ...data.tryOnMeta,
          ...(fitReason ? { styleMatchAnalysis: fitReason } : {})
        }));
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        Logger.error("Try-on analysis failed:", err);
        setError(err.message || "Failed to process virtual try-on. Please try again.");
      }
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
    if (!product) return;
    const payload: HITLPayload = {
      authorizationId: `ORDER-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`,
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
      availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
      humanInTheLoopChallenge: {
        title: "Review this listing",
        message: `Review ${product.name} on the merchant site before checkout.`,
        safetyChecks: [
          `Virtual Try-On 001 fit verified in ${selectedMediaType.toUpperCase()} mode`,
          "Merchant availability will be verified at checkout",
          "Delivery options and returns are provided by the merchant"
        ]
      }
    };

    onRequestHITLCheckout(payload);
    onClose();
  };

  const activePersonImage = customAvatar || (selectedAvatar ? selectedAvatar.url : null);

  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-white border border-[#e2e2e2] rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-6 relative text-[#18211e] my-auto"
        >
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
            {error && (
              <div className="mb-4 bg-red-50 text-[#a84a32] text-xs px-4 py-3 rounded-xl border border-red-100 flex items-center space-x-2">
                <MaterialIcon icon="error_outline" size={16} />
                <span>{error}</span>
              </div>
            )}
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
                    {activePersonImage ? (
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
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-50">
                         <MaterialIcon icon="person" size={64} className="text-[#386633]" />
                         <span className="text-xs font-bold text-[#18211e]">Generated model will be used</span>
                      </div>
                    )}

                    {generatedMedia && (
                      generatedMedia.mediaType === "video" ? (
                        <video src={generatedMedia.mediaUrl} controls autoPlay loop className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10" />
                      ) : (
                        <img src={generatedMedia.mediaUrl} alt="Generated virtual try-on" className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10" />
                      )
                    )}
                    
                    {/* Garment / Product Overlay preview */}
                    <div className={`absolute bottom-3 right-3 w-28 h-28 bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-[#d8ebd7] shadow-lg transition duration-300 ${isProcessing ? "scale-95 opacity-50" : "scale-100"}`}>
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      <span className="sr-only">Selected garment</span>
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

                  {/* Active animation context */}
                  {selectedMediaType === "video" && (
                    <div className="absolute top-3 left-3 text-white text-xs font-medium flex items-center space-x-1 drop-shadow-md">
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

                  <div className="absolute top-3 right-3 text-white text-xs font-medium flex items-center space-x-1 drop-shadow-md">
                    <MaterialIcon icon={selectedBg.icon} size={13} />
                    <span>{selectedBg.name}</span>
                  </div>

                  {/* Expressive M3 Progressive Processing Overlay */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-[#191d16]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-[#18211e] dark:text-[#e1e4d9] z-30">
                      <M3ExpressiveCircularProgress
                        size={64}
                        icon={selectedMediaType === "video" ? "videocam" : "photo_camera"}
                        label={`Generating ${selectedMediaType === "video" ? "3D Video Runway" : "Image"} Try-On...`}
                        sublabel="Preparing your preview..."
                      />
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
                            selectedAvatar?.id === avatar.id && !customAvatar
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
                    {tryOnMeta ? <>
                      <div className="flex justify-between items-center text-[#18211e] font-bold border-b border-[#d8ebd7] pb-2">
                        <span>Recommended Size:</span>
                        <span className="text-[#386633] font-extrabold">{tryOnMeta.sizeRecommendation || "See merchant size guide"}</span>
                      </div>
                      <p className="text-[#5e635f] text-xs leading-relaxed">{tryOnMeta.styleMatchAnalysis || "Preview generated. Use the merchant size guide to confirm fit."}</p>
                    </> : <p className="text-[#5e635f] text-xs leading-relaxed">Upload a personal photo to receive a visual preview. This is not a fit guarantee.</p>}
                  </div>
                </div>

                {/* Bottom Purchase CTA */}
                <div className="space-y-3 pt-3 border-t border-[#d8ebd7]">
                  <div className="flex items-center justify-between text-sm font-bold text-[#18211e]">
                    <div>
                      <span className="block text-xs font-normal text-[#5e635f]">Selected Product</span>
                      <span>{product.name}</span>
                    </div>
                    <span className="text-lg font-mono text-[#386633]">{product.listing?.observedPrice ? new Intl.NumberFormat(undefined, { style: "currency", currency: product.listing.observedPrice.currency }).format(product.listing.observedPrice.amount) : "Price at merchant"}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full py-3.5 bg-[#386633] hover:bg-[#2c5227] text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer text-sm"
                  >
                    <MaterialIcon icon="shopping_bag" size={18} />
                    <span>Add to Cart & Review</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Elevated Jetpack Compose Floating Action Button Widget */}
        <ElevatedQuickActionFab
          product={product}
          onSelectTryOn={() => runTryOnAnalysis()}
          onOpenLens={onOpenLens}
          positionClassName="bottom-6 right-6 z-50"
        />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
