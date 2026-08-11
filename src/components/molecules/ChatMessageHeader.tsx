import React from 'react';
import { MaterialIcon } from '../MaterialIcon';

interface ChatMessageHeaderProps {
  sender: 'user' | 'ai';
  timestamp: string;
}

export const ChatMessageHeader: React.FC<ChatMessageHeaderProps> = ({ sender, timestamp }) => {
  const isUser = sender === 'user';
  return (
    <div className={`flex items-center space-x-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center">
          <MaterialIcon icon="auto_awesome" size={14} />
        </div>
      )}
      <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] font-medium">
        {isUser ? 'You' : 'Spresso AI'}
      </span>
      <span className="text-[9px] text-[var(--md-sys-color-on-surface-variant)] opacity-70">
        {timestamp}
      </span>
    </div>
  );
};
