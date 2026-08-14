import React from 'react';
import { ChatMessage } from '../../../types';
import { ChatThoughtBox } from './ChatThoughtBox';
import { ChatGroundingSources } from './ChatGroundingSources';

export const ChatBubbleText: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {!isUser && message.thought && <ChatThoughtBox thought={message.thought} isStreaming={message.isStreaming} />}
      <div 
        className={`max-w-xl p-4 rounded-3xl text-sm ${
          isUser 
            ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-br-none" 
            : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-bl-none border border-[var(--md-sys-color-outline-variant)]"
        }`}
      >
        {!isUser && message.isStreaming && !message.text ? (
          <div className="flex items-center space-x-2 py-1">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            <span className="text-xs opacity-70">Sourcing recommendations...</span>
          </div>
        ) : (
          <div>{message.text}</div>
        )}
        {!isUser && message.sources && <ChatGroundingSources sources={message.sources} />}
      </div>
    </div>
  );
};
