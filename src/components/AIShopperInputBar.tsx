import React, { useState, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { GoogleLensScreenWidgetModal } from "./GoogleLensScreenWidgetModal";
import { CameraObjectDetectionModal } from "./CameraObjectDetectionModal";
import { LiveCookingAssistantModal } from "./LiveCookingAssistantModal";
import { ProductItem } from "../types";

export interface AIShopperInputBarProps {
  onSend: (text: string, attachedImage?: string | null) => void;
  isTyping?: boolean;
  placeholder?: string;
  className?: string;
  onSelectTryOn?: (product: ProductItem) => void;
  onAddToCart?: (product: ProductItem) => void;
  // Bi-directional voice props
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  onToggleVoice?: () => void;
  onStopVoice?: () => void;
  // Layout option
  sticky?: boolean;
}

export const AIShopperInputBar: React.FC<AIShopperInputBarProps> = ({
  onSend,
  isTyping = false,
  placeholder = "Ask anything...",
  className = "",
  onSelectTryOn,
  onAddToCart,
  isVoiceActive = false,
  isSpeaking = false,
  isListening = false,
  onToggleVoice,
  onStopVoice,
  sticky = true
}) => {
  const [inputQuery, setInputQuery] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [googleLensOpen, setGoogleLensOpen] = useState(false);
  const [cameraDetectionOpen, setCameraDetectionOpen] = useState(false);
  const [liveCookingOpen, setLiveCookingOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputQuery.trim() && !attachedImage) || isTyping) return;
    
    const queryToSend = inputQuery;
    const imgToSend = attachedImage;
    
    setInputQuery("");
    setAttachedImage(null);
    onSend(queryToSend, imgToSend);
  };

  return (
    <div className={`${sticky ? "sticky bottom-0 bg-gradient-to-t from-[#f8faf0] via-[#f8faf0] dark:from-[#11140f] dark:via-[#11140f] to-transparent pt-3 pb-3 space-y-2 z-30" : "w-full space-y-2"} ${className}`}>
      {/* Bi-directional Voice Active Indicator Banner */}
      {isVoiceActive && (
        <div className="flex items-center justify-between bg-[#191d16] dark:bg-[#1d211a] text-[#e1e4d9] px-4 py-2 rounded-full shadow-lg border border-[#446732]/40 dark:border-[#a9d291]/40 animate-fade-in mx-1">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a9d291] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#a9d291]"></span>
            </span>
            <span className="text-xs font-medium text-[#c5efab]">
              {isSpeaking ? "Spresso AI is speaking..." : isListening ? "Listening... Speak now" : "Bi-directional Voice Mode Active"}
            </span>
          </div>
          {onStopVoice && (
            <button
              type="button"
              onClick={onStopVoice}
              className="text-xs text-[#c3c8bb] hover:text-white px-2 py-0.5 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              End Voice
            </button>
          )}
        </div>
      )}

      {/* Image Attachment Preview */}
      {attachedImage && (
        <div className="relative inline-block bg-white dark:bg-[#191d16] p-1.5 rounded-2xl border border-[#dfe4d7] dark:border-[#43483e] shadow-xs">
          <img src={attachedImage} alt="Attachment" className="w-16 h-16 object-cover rounded-xl" />
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] rounded-full flex items-center justify-center text-xs shadow cursor-pointer hover:bg-[#2d4f1c] dark:hover:bg-[#c5efab] transition"
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* AI Responding Status Banner with Rainbow Gradient Indicator */}
      {isTyping && (
        <div className="flex items-center justify-between bg-white/95 dark:bg-[#191d16]/95 text-[#191d16] dark:text-[#e1e4d9] px-4 py-1.5 rounded-full shadow-xs border border-[#dfe4d7] dark:border-[#43483e] backdrop-blur-md animate-fade-in mx-1">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400"></span>
            </span>
            <span className="text-xs font-semibold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 dark:from-pink-400 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent">
              Spresso AI Personal Shopper is responding...
            </span>
          </div>
          <MaterialIcon icon="auto_awesome" size={16} className="text-amber-500 animate-spin" />
        </div>
      )}

      {/* Minimalist Input Pill Bar (With Rainbow Animated Border when AI is Responding in Light & Dark Mode) */}
      <div className={`transition-all ${isTyping ? "rainbow-border-container shadow-md scale-[1.005]" : ""}`}>
        <form
          onSubmit={handleSubmit}
          className="flex items-center space-x-2 bg-white dark:bg-[#191d16] px-3.5 py-2.5 rounded-full border border-[#dfe4d7] dark:border-[#43483e] shadow-sm hover:border-[#a9d291] focus-within:border-[#446732] dark:focus-within:border-[#a9d291] focus-within:ring-2 focus-within:ring-[#446732]/20 transition-all w-full"
        >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Plus Add Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-8 h-8 rounded-full text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-[#e1e4d9] hover:bg-[#f2f5ea] dark:hover:bg-[#282b24] flex items-center justify-center transition cursor-pointer flex-shrink-0"
          title="Attach image or file"
        >
          <MaterialIcon icon="add" size={22} />
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder={isVoiceActive ? "Listening or type..." : placeholder}
          className="flex-1 bg-transparent px-1 py-1 text-sm text-[#191d16] dark:text-[#e1e4d9] placeholder-[#747878] dark:placeholder-[#c3c8bb] focus:outline-none"
        />

        {/* Camera Search (Object Detection for Product Listings) */}
        <button
          type="button"
          onClick={() => setCameraDetectionOpen(true)}
          className="p-1.5 text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-[#e1e4d9] hover:bg-[#f2f5ea] dark:hover:bg-[#282b24] rounded-full transition cursor-pointer"
          title="Camera Object Detection (Product Listing)"
        >
          <MaterialIcon icon="photo_camera" size={18} />
        </button>

        {/* Realtime Live Cooking Camera & Voice Agent */}
        <button
          type="button"
          onClick={() => setLiveCookingOpen(true)}
          className="p-1.5 text-[#43483e] dark:text-[#c3c8bb] hover:text-[#446732] dark:hover:text-[#a9d291] hover:bg-[#e8f3e8] dark:hover:bg-[#282b24] rounded-full transition cursor-pointer"
          title="Realtime Voice & Camera Live Cooking Assistant"
        >
          <MaterialIcon icon="videocam" size={18} className="text-[#446732] dark:text-[#a9d291]" />
        </button>

        {/* Google Lens Phone Widget Search */}
        <button
          type="button"
          onClick={() => setGoogleLensOpen(true)}
          className="p-1.5 text-[#43483e] dark:text-[#c3c8bb] hover:text-[#446732] dark:hover:text-[#a9d291] hover:bg-[#e8f3e8] dark:hover:bg-[#282b24] rounded-full transition cursor-pointer"
          title="Google Lens Phone Widget"
        >
          <MaterialIcon icon="google_lens" size={18} />
        </button>

        {/* Voice Pill / Send Action Button */}
        {inputQuery.trim() || attachedImage ? (
          <button
            type="submit"
            disabled={isTyping}
            className="px-3.5 py-1.5 bg-[#446732] hover:bg-[#2d4f1c] dark:bg-[#a9d291] dark:hover:bg-[#c5efab] text-white dark:text-[#173807] disabled:opacity-40 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-xs"
            title="Send message to AI Shopper"
          >
            <MaterialIcon icon="send" size={14} />
            <span>Send</span>
          </button>
        ) : onToggleVoice ? (
          <button
            type="button"
            onClick={onToggleVoice}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 ${
              isVoiceActive
                ? "bg-[#446732] dark:bg-[#a9d291] text-white dark:text-[#173807] shadow-md ring-2 ring-[#446732]/30 dark:ring-[#a9d291]/30"
                : "bg-[#f2f5ea] dark:bg-[#282b24] hover:bg-[#446732] dark:hover:bg-[#a9d291] hover:text-white dark:hover:text-[#173807] text-[#191d16] dark:text-[#e1e4d9]"
            }`}
            title={isVoiceActive ? "Stop Voice Mode" : "Start Real-Time Bi-Directional Voice"}
          >
            <MaterialIcon icon="graphic_eq" size={14} className={isVoiceActive ? "animate-pulse text-[#c5efab] dark:text-[#173807]" : ""} />
            <span>{isVoiceActive ? (isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Voice On") : "Voice"}</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={isTyping}
            className="px-3.5 py-1.5 bg-[#446732] hover:bg-[#2d4f1c] dark:bg-[#a9d291] dark:hover:bg-[#c5efab] text-white dark:text-[#173807] disabled:opacity-40 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-xs"
            title="Send message to AI Shopper"
          >
            <MaterialIcon icon="send" size={14} />
            <span>Send</span>
          </button>
        )}
      </form>
      </div>

      {/* Google Lens Phone Screen Widget Modal */}
      <GoogleLensScreenWidgetModal
        isOpen={googleLensOpen}
        onClose={() => setGoogleLensOpen(false)}
        onSearchComplete={(queryText, imageBase64) => {
          onSend(queryText, imageBase64);
        }}
      />

      {/* Camera Object Detection Modal (For Product Listings) */}
      <CameraObjectDetectionModal
        isOpen={cameraDetectionOpen}
        onClose={() => setCameraDetectionOpen(false)}
        onSelectTryOn={onSelectTryOn}
        onSelectProductListing={(newProduct) => {
          if (onAddToCart) {
            onAddToCart(newProduct);
          }
          onSend(`Added new camera object detection product listing to Spresso: "${newProduct.name}" by ${newProduct.brand} ($${newProduct.price}).`);
        }}
      />
      {/* Live Cooking Camera & Voice Realtime Modal */}
      <LiveCookingAssistantModal
        isOpen={liveCookingOpen}
        onClose={() => setLiveCookingOpen(false)}
      />
    </div>
  );
};
