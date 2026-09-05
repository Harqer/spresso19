import React from 'react';
import { MaterialIcon } from '../../MaterialIcon';

interface ChatMessageHeaderProps {
  sender: 'user' | 'ai';
  timestamp: string;
  isStreaming?: boolean;
}

export const ChatMessageHeader: React.FC<ChatMessageHeaderProps> = ({ sender, timestamp, isStreaming }) => {
  const isUser = sender === 'user';
  return (
    <div className={`flex items-center space-x-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="avatar-marble" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF7A00">
                </stop>
                <stop offset="50%" stopColor="#FF004D">
                </stop>
                <stop offset="100%" stopColor="#9000FF">
                </stop>
              </linearGradient>
              <filter id="avatar-wavy">
                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise">
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
              </filter>
              <clipPath id="avatar-clip">
                <circle cx="50" cy="50" r="50" />
              </clipPath>
            </defs>
            <g clipPath="url(#avatar-clip)">
              <rect x="-20" y="-20" width="140" height="140" fill="url(#avatar-marble)" filter="url(#avatar-wavy)" />
            </g>
          </svg>
        </div>
      )}
      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-medium">
        {isUser ? 'You' : 'Spresso'}
      </span>
      <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] opacity-70">
        {timestamp}
      </span>
    </div>
  );
};
