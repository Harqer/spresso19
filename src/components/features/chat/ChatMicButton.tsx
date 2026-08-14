import React from 'react';
import { MaterialIcon } from '../../MaterialIcon';

interface ChatMicButtonProps {
  isListening?: boolean;
  onClick: () => void;
}

export const ChatMicButton: React.FC<ChatMicButtonProps> = ({ isListening, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-full flex items-center justify-center transition-all ${
        isListening 
          ? "bg-red-500 text-white animate-pulse" 
          : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90"
      }`}
    >
      <MaterialIcon icon={isListening ? "mic" : "mic_none"} size={20} />
    </button>
  );
};
