import React, { useState, useRef } from "react";
import { MaterialIcon } from "./MaterialIcon";
import { GoogleLensScreenWidgetModal } from "./GoogleLensScreenWidgetModal";
import { CameraObjectDetectionModal } from "./CameraObjectDetectionModal";
import { LiveCookingAssistantModal } from "./LiveCookingAssistantModal";
import { ProductItem } from "../types";
import { MicButton } from "./atoms/MicButton";
import { AttachmentChipsBar } from "./molecules/AttachmentChipsBar";

export interface AIShopperInputBarProps {
  onSend: (text: string, attachedImage?: string | null) => void;
  value?: string;
  onChange?: (value: string) => void;
  isTyping?: boolean;
  placeholder?: string;
  className?: string;
  onSelectTryOn?: (product: ProductItem) => void;
  onAddToCart?: (product: ProductItem) => void;
  onOpenLiveCamera?: () => void;
  onOpenObjectDetection?: () => void;
  onOpenLensWidget?: () => void;
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  onToggleVoice?: () => void;
  onStopVoice?: () => void;
  sticky?: boolean;
}

export const AIShopperInputBar: React.FC<AIShopperInputBarProps> = ({
  onSend, isTyping = false, placeholder = "Ask anything...", className = "",
  onSelectTryOn, onAddToCart, isVoiceActive = false, isSpeaking = false,
  isListening = false, onToggleVoice, onStopVoice, sticky = true
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
      reader.onloadend = () => setAttachedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputQuery.trim() && !attachedImage) || isTyping) return;
    const q = inputQuery, img = attachedImage;
    setInputQuery(""); setAttachedImage(null);
    onSend(q, img);
  };

  return (
    <div className={`${sticky ? "sticky bottom-0 bg-gradient-to-t from-[var(--md-sys-color-background)] via-[var(--md-sys-color-background)] to-transparent pt-3 pb-3 space-y-2 z-30" : "w-full space-y-2"} ${className}`}>
      <AttachmentChipsBar attachedImage={attachedImage} onClearImage={() => setAttachedImage(null)} isVoiceActive={isVoiceActive} isSpeaking={isSpeaking} isListening={isListening} onStopVoice={onStopVoice} isTyping={isTyping} />

      <form onSubmit={handleSubmit} className="flex items-center space-x-2 bg-[var(--md-sys-color-surface-container-lowest)] px-3.5 py-2.5 rounded-full border border-[var(--md-sys-color-outline-variant)] shadow-sm hover:border-[var(--md-sys-color-outline)] focus-within:border-[var(--md-sys-color-primary)] transition-all w-full">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-8 h-8 rounded-full text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] flex items-center justify-center cursor-pointer flex-shrink-0" title="Attach image">
          <MaterialIcon icon="add" size={22} />
        </button>
        <input type="text" value={inputQuery} onChange={e => setInputQuery(e.target.value)} placeholder={isVoiceActive ? "Listening or type..." : placeholder} className="flex-1 bg-transparent px-1 py-1 text-sm text-[var(--md-sys-color-on-surface)] placeholder-[var(--md-sys-color-outline)] focus:outline-none" />
        <button type="button" onClick={() => setCameraDetectionOpen(true)} className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] rounded-full cursor-pointer" title="Camera Object Detection">
          <MaterialIcon icon="photo_camera" size={18} />
        </button>
        <button type="button" onClick={() => setLiveCookingOpen(true)} className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] rounded-full cursor-pointer" title="Live Cooking Assistant">
          <MaterialIcon icon="videocam" size={18} className="text-[var(--md-sys-color-primary)]" />
        </button>
        <button type="button" onClick={() => setGoogleLensOpen(true)} className="p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] rounded-full cursor-pointer" title="Google Lens Widget">
          <MaterialIcon icon="google_lens" size={18} />
        </button>
        {inputQuery.trim() || attachedImage ? (
          <button type="submit" disabled={isTyping} className="px-3.5 py-1.5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full text-xs font-medium flex items-center space-x-1.5 cursor-pointer flex-shrink-0 shadow-xs">
            <MaterialIcon icon="send" size={14} /><span>Send</span>
          </button>
        ) : (
          <MicButton isVoiceActive={isVoiceActive} isSpeaking={isSpeaking} isListening={isListening} isTyping={isTyping} onToggleVoice={onToggleVoice} />
        )}
      </form>

      <GoogleLensScreenWidgetModal isOpen={googleLensOpen} onClose={() => setGoogleLensOpen(false)} onSearchComplete={(q, img) => onSend(q, img)} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />
      <CameraObjectDetectionModal isOpen={cameraDetectionOpen} onClose={() => setCameraDetectionOpen(false)} onSelectTryOn={onSelectTryOn} onSelectProductListing={(p) => { onAddToCart?.(p); onSend(`Added camera listing: "${p.name}"`); }} />
      <LiveCookingAssistantModal isOpen={liveCookingOpen} onClose={() => setLiveCookingOpen(false)} />
    </div>
  );
};
