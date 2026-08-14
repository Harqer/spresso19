import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

export const ChatThoughtBox: React.FC<{ thought?: string; isStreaming?: boolean }> = ({ thought, isStreaming }) => {
  if (!thought?.trim()) return null;
  return (
    <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-[var(--md-sys-color-surface-variant)]/40 border border-[var(--md-sys-color-outline-variant)]/50 max-w-md my-1">
      <div className="w-3.5 h-3.5 shrink-0 mt-0.5">
        <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="thought-marble" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF7A00">
                {isStreaming && <animate attributeName="stop-color" values="#FF7A00;#FF004D;#9000FF;#FF7A00" dur="8s" repeatCount="indefinite" />}
              </stop>
              <stop offset="50%" stopColor="#FF004D">
                {isStreaming && <animate attributeName="stop-color" values="#FF004D;#9000FF;#FF7A00;#FF004D" dur="8s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="#9000FF">
                {isStreaming && <animate attributeName="stop-color" values="#9000FF;#FF7A00;#FF004D;#9000FF" dur="8s" repeatCount="indefinite" />}
              </stop>
            </linearGradient>
            <filter id="thought-wavy">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise">
                {isStreaming && <animate attributeName="baseFrequency" values="0.015;0.02;0.015" dur="10s" repeatCount="indefinite" />}
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <clipPath id="thought-clip">
              <circle cx="50" cy="50" r="50" />
            </clipPath>
          </defs>
          <g clipPath="url(#thought-clip)">
            <rect x="-20" y="-20" width="140" height="140" fill="url(#thought-marble)" filter="url(#thought-wavy)" />
          </g>
        </svg>
      </div>
      <p className="text-xs italic text-[var(--md-sys-color-on-surface-variant)]/80 leading-relaxed">{thought}</p>
    </div>
  );
};
