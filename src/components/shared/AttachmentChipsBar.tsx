import React from "react";
import { MaterialIcon } from "../MaterialIcon";

export interface AttachmentChipsBarProps {
  attachedImage?: string | null;
  onClearImage?: () => void;
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  onStopVoice?: () => void;
  isTyping?: boolean;
}

export const AttachmentChipsBar: React.FC<AttachmentChipsBarProps> = ({
  attachedImage, onClearImage, isVoiceActive, isSpeaking, isListening, onStopVoice, isTyping
}) => {
  return (
    <div className="space-y-2">
      {isVoiceActive && (
        <div className="flex items-center justify-between bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] px-4 py-2 rounded-full shadow-lg border border-[var(--md-sys-color-primary)]/40 mx-1">
          <div className="flex items-center space-x-2.5">
            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-sys-color-primary)] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--md-sys-color-primary)]"></span></span>
            <span className="text-xs font-medium text-[var(--md-sys-color-primary)]">{isSpeaking ? "Spresso is speaking..." : isListening ? "Listening... Speak now" : "Bi-directional Voice Mode Active"}</span>
          </div>
          {onStopVoice && <button type="button" onClick={onStopVoice} className="text-xs text-[var(--md-sys-color-on-surface-variant)] px-2 py-0.5 rounded-full hover:bg-[var(--md-sys-color-surface-container-high)] cursor-pointer">End Voice</button>}
        </div>
      )}

      {attachedImage && (
        <div className="relative inline-block bg-[var(--md-sys-color-surface-container-lowest)] p-1.5 rounded-2xl border border-[var(--md-sys-color-outline-variant)] shadow-xs">
          <img src={attachedImage} alt="Attachment" className="w-16 h-16 object-cover rounded-xl" />
          {onClearImage && <button type="button" onClick={onClearImage} className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full flex items-center justify-center text-xs shadow cursor-pointer">×</button>}
        </div>
      )}

      {isTyping && (
        <div className="flex items-center justify-between bg-[var(--md-sys-color-surface-container-lowest)]/95 text-[var(--md-sys-color-on-surface)] px-4 py-1.5 rounded-full shadow-xs border border-[var(--md-sys-color-outline-variant)] mx-1">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-400"></span></span>
            <span className="text-xs font-semibold text-[var(--md-sys-color-primary)]">Spresso AI is responding...</span>
          </div>
          <MaterialIcon icon="auto_awesome" size={16} className="text-amber-500 animate-spin" />
        </div>
      )}
    </div>
  );
};
