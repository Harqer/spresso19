import React from "react";
import { MaterialIcon } from "../MaterialIcon";

export interface MicButtonProps {
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  isListening?: boolean;
  isTyping?: boolean;
  onToggleVoice?: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({ isVoiceActive, isSpeaking, isListening, isTyping, onToggleVoice }) => {
  if (!onToggleVoice) return null;
  return (
    <button
      type="button" onClick={onToggleVoice} disabled={isTyping}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer flex-shrink-0 ${
        isVoiceActive ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md" : "bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-primary)] hover:text-[var(--md-sys-color-on-primary)] text-[var(--md-sys-color-on-surface)]"
      }`}
      title={isVoiceActive ? "Stop Voice Mode" : "Start Voice"}
    >
      <MaterialIcon icon="graphic_eq" size={14} className={isVoiceActive ? "animate-pulse" : ""} />
      <span>{isVoiceActive ? (isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Voice On") : "Voice"}</span>
    </button>
  );
};
