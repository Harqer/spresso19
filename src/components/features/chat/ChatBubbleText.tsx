import React from 'react';
import { ChatMessage } from '../../../types';
import { ChatGroundingSources } from './ChatGroundingSources';

export const ChatBubbleText: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div 
        className={`max-w-xl p-4 rounded-3xl text-sm ${
          isUser 
            ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-br-none" 
            : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-bl-none border border-[var(--md-sys-color-outline-variant)]"
        }`}
      >
        {!isUser && message.isStreaming && !message.text ? (
          <div className="min-h-5" aria-hidden="true" />
        ) : (
          <div>{message.text}</div>
        )}
        {!isUser && message.sources && <ChatGroundingSources sources={message.sources} />}
      </div>
    </div>
  );
};
