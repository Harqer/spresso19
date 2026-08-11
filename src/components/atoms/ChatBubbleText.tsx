import React from 'react';
import { ChatMessage } from '../../types';
import { Dithering } from '@paper-design/shaders-react';

export const ChatBubbleText: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === "user";
  const [colorFront, setColorFront] = React.useState("#386633");

  React.useEffect(() => {
    const updateColor = () => {
      const primaryColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--md-sys-color-primary')
        .trim();
      if (primaryColor) {
        setColorFront(primaryColor);
      }
    };
    updateColor();

    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div 
        className={`max-w-xl p-4 rounded-3xl text-sm ${
          isUser 
            ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-br-none" 
            : "bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-bl-none border border-[var(--md-sys-color-outline-variant)]"
        }`}
      >
        {!isUser && message.isStreaming && !message.text ? (
          <div className="flex flex-col items-center justify-center py-2 px-6">
            <div className="overflow-hidden rounded-xl bg-transparent">
              <Dithering 
                speed={1.2} 
                shape="sphere" 
                type="4x4" 
                size={2} 
                scale={0.7} 
                colorBack="#00000000" 
                colorFront={colorFront} 
                style={{ backgroundColor: 'transparent', height: '50px', width: '120px' }} 
              />
            </div>
            <span className="text-[10px] font-mono opacity-50 mt-1">AI Sourcing Products...</span>
          </div>
        ) : (
          <div>{message.text}</div>
        )}
      </div>
    </div>
  );
};
