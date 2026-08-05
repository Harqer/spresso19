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
    <div className={`${sticky ? "sticky bottom-0 bg-gradient-to-t from-[#fafcf9] via-[#fafcf9] to-transparent pt-3 pb-3 space-y-2 z-30" : "w-full space-y-2"} ${className}`}>
      {/* Bi-directional Voice Active Indicator Banner */}
      {isVoiceActive && (
        <div className="flex items-center justify-between bg-[#18211e] text-white px-4 py-2 rounded-2xl shadow-lg border border-[#386633]/40 animate-fade-in mx-1">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-medium text-emerald-100">
              {isSpeaking ? "Spresso AI is speaking..." : isListening ? "Listening... Speak now" : "Bi-directional Voice Mode Active"}
            </span>
          </div>
          {onStopVoice && (
            <button
              type="button"
              onClick={onStopVoice}
              className="text-xs text-[#a0aba5] hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              End Voice
            </button>
          )}
        </div>
      )}

      {/* Image Attachment Preview */}
      {attachedImage && (
        <div className="relative inline-block bg-white p-1.5 rounded-xl border border-[#d8ebd7] shadow-xs">
          <img src={attachedImage} alt="Attachment" className="w-16 h-16 object-cover rounded-lg" />
          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-[#386633] text-white rounded-full flex items-center justify-center text-xs shadow cursor-pointer hover:bg-[#2c5227] transition"
            title="Remove image"
          >
            ×
          </button>
        </div>
      )}

      {/* Minimalist Input Pill Bar */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center space-x-2 bg-white px-3.5 py-2.5 rounded-full border border-[#d2d5d3] shadow-sm hover:border-[#b0d4af] focus-within:border-[#386633] focus-within:ring-2 focus-within:ring-[#386633]/20 transition-all"
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
          className="w-8 h-8 rounded-full text-[#5e635f] hover:text-[#18211e] hover:bg-[#f3f3f4] flex items-center justify-center transition cursor-pointer flex-shrink-0"
          title="Attach image or file"
        >
          <MaterialIcon icon="add" size={22} />
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder={isVoiceActive ? "Listening or type..." : placeholder}
          className="flex-1 bg-transparent px-1 py-1 text-sm text-[#18211e] placeholder-[#747878] focus:outline-none"
        />

        {/* Camera Search (Object Detection for Product Listings) */}
        <button
          type="button"
          onClick={() => setCameraDetectionOpen(true)}
          className="p-1.5 text-[#5e635f] hover:text-[#18211e] hover:bg-[#f3f3f4] rounded-full transition cursor-pointer"
          title="Camera Object Detection (Product Listing)"
        >
          <MaterialIcon icon="photo_camera" size={18} />
        </button>

        {/* Realtime Live Cooking Camera & Voice Agent */}
        <button
          type="button"
          onClick={() => setLiveCookingOpen(true)}
          className="p-1.5 text-[#5e635f] hover:text-[#386633] hover:bg-[#e8f3e8] rounded-full transition cursor-pointer"
          title="Realtime Voice & Camera Live Cooking Assistant"
        >
          <MaterialIcon icon="videocam" size={18} className="text-[#386633]" />
        </button>

        {/* Google Lens Phone Widget Search */}
        <button
          type="button"
          onClick={() => setGoogleLensOpen(true)}
          className="p-1.5 text-[#5e635f] hover:text-[#386633] hover:bg-[#e8f3e8] rounded-full transition cursor-pointer"
          title="Google Lens Phone Widget"
        >
          <MaterialIcon icon="google_lens" size={18} />
        </button>

        {/* Voice Pill / Send Action Button */}
        {inputQuery.trim() || attachedImage ? (
          <button
            type="submit"
            disabled={isTyping}
            className="px-3.5 py-1.5 bg-[#386633] hover:bg-[#2c5227] text-white disabled:opacity-40 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-xs"
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
                ? "bg-[#386633] text-white shadow-md ring-2 ring-[#386633]/30"
                : "bg-[#f3f3f4] hover:bg-[#386633] hover:text-white text-[#18211e]"
            }`}
            title={isVoiceActive ? "Stop Voice Mode" : "Start Real-Time Bi-Directional Voice"}
          >
            <MaterialIcon icon="graphic_eq" size={14} className={isVoiceActive ? "animate-pulse text-emerald-300" : ""} />
            <span>{isVoiceActive ? (isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Voice On") : "Voice"}</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={isTyping}
            className="px-3.5 py-1.5 bg-[#386633] hover:bg-[#2c5227] text-white disabled:opacity-40 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-xs"
            title="Send message to AI Shopper"
          >
            <MaterialIcon icon="send" size={14} />
            <span>Send</span>
          </button>
        )}
      </form>

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
