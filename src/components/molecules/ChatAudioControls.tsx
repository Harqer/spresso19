import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

interface ChatAudioControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const ChatAudioControls: React.FC<ChatAudioControlsProps> = ({ isPlaying, onTogglePlay }) => {
  return (
    <div className="flex items-center space-x-2 bg-[var(--md-sys-color-surface-container)] rounded-full px-3 py-1.5 border border-[var(--md-sys-color-outline-variant)]">
      <button 
        onClick={onTogglePlay}
        className="text-[var(--md-sys-color-primary)] hover:opacity-80 transition flex items-center justify-center"
      >
        <MaterialIcon icon={isPlaying ? "pause_circle" : "play_circle"} size={20} />
      </button>
      <div className="flex space-x-0.5 items-center h-4">
        {[...Array(5)].map((_, i) => (
          <div 
            key={i} 
            className={`w-1 bg-[var(--md-sys-color-primary)] rounded-full transition-all duration-150 ${isPlaying ? 'h-full animate-pulse' : 'h-1'}`}
            style={isPlaying ? { animationDelay: `${i * 0.1}s` } : {}}
          />
        ))}
      </div>
    </div>
  );
};
