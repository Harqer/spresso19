import React from 'react';
import { MaterialIcon } from '../../MaterialIcon';

export interface ChatAudioControlsProps {
  isPlaying?: boolean;
  isPaused?: boolean;
  isMuted?: boolean;
  isListening?: boolean;
  audioLevels?: number[];
  onTogglePlay?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onToggleMute?: () => void;
  onInterrupt?: () => void;
  className?: string;
}

export const ChatAudioControls: React.FC<ChatAudioControlsProps> = ({
  isPlaying = false,
  isPaused = false,
  isMuted = false,
  isListening = false,
  audioLevels,
  onTogglePlay,
  onPause,
  onResume,
  onToggleMute,
  onInterrupt,
  className = ""
}) => {
  const activePlay = isPlaying && !isPaused;

  const handlePlayPauseClick = () => {
    if (activePlay) {
      if (onPause) onPause();
      else if (onTogglePlay) onTogglePlay();
    } else {
      if (onResume) onResume();
      else if (onTogglePlay) onTogglePlay();
    }
  };

  const bars = [0.4, 0.7, 1.0, 0.6, 0.3, 0.85, 0.5];

  return (
    <div
      className={`flex items-center space-x-2 bg-[var(--md-sys-color-surface-container)] rounded-full px-3 py-1.5 border border-[var(--md-sys-color-outline-variant)] shadow-sm transition-all ${className}`}
    >
      {/* Play / Pause / Resume Button */}
      {(onTogglePlay || onPause || onResume) && (
        <button
          type="button"
          onClick={handlePlayPauseClick}
          className="text-[var(--md-sys-color-primary)] hover:opacity-80 transition flex items-center justify-center cursor-pointer p-0.5"
          title={activePlay ? "Pause Audio Playback" : "Play / Resume Audio"}
        >
          <MaterialIcon
            icon={activePlay ? "pause_circle" : "play_circle"}
            size={20}
          />
        </button>
      )}

      {/* Mute / Unmute Button */}
      {onToggleMute && (
        <button
          type="button"
          onClick={onToggleMute}
          className={`transition flex items-center justify-center cursor-pointer p-0.5 ${
            isMuted
              ? "text-red-500 hover:text-red-600"
              : "text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)]"
          }`}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          <MaterialIcon
            icon={isMuted ? "mic_off" : "mic"}
            size={18}
          />
        </button>
      )}

      {/* Visual Mic Wave Indicators */}
      <div className="flex space-x-1 items-center h-5 px-1">
        {bars.map((defaultHeight, i) => {
          const customLevel = audioLevels && audioLevels[i] !== undefined ? audioLevels[i] : null;
          const isActive = !isMuted && (activePlay || isListening);

          let barHeightPercent = "20%";
          if (isMuted) {
            barHeightPercent = "15%";
          } else if (customLevel !== null) {
            barHeightPercent = `${Math.min(100, Math.max(15, customLevel * 100))}%`;
          } else if (isActive) {
            barHeightPercent = `${defaultHeight * 100}%`;
          }

          return (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isMuted
                  ? "bg-slate-400/40 h-1"
                  : isActive
                  ? "bg-[var(--md-sys-color-primary)] animate-pulse"
                  : "bg-[var(--md-sys-color-outline-variant)] h-1.5"
              }`}
              style={{
                height: isMuted ? "4px" : isActive ? barHeightPercent : undefined,
                animationDelay: isActive ? `${i * 0.12}s` : undefined
              }}
            />
          );
        })}
      </div>

      {/* Interrupt Response Button */}
      {onInterrupt && (
        <button
          type="button"
          onClick={onInterrupt}
          className="text-red-500/80 hover:text-red-500 transition flex items-center justify-center cursor-pointer p-0.5 ml-1"
          title="Interrupt AI Response"
        >
          <MaterialIcon icon="cancel" size={18} />
        </button>
      )}
    </div>
  );
};

