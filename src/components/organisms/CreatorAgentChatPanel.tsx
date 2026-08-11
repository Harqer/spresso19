import React, { useRef, useEffect, useState } from "react";
import { MaterialIcon } from "../MaterialIcon";
import ReactMarkdown from "react-markdown";
import { GenAIAgentType } from "../pages/CreatorGenAIAgentsChatPage";
import { Dithering } from '@paper-design/shaders-react';

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  agentType?: GenAIAgentType;
  isStreaming?: boolean;
}

interface CreatorAgentChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  inputPrompt: string;
  setInputPrompt: (p: string) => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  activeAgentMeta: { title: string; id: GenAIAgentType };
  AGENTS_METADATA: { id: GenAIAgentType; title: string }[];
}

export const CreatorAgentChatPanel: React.FC<CreatorAgentChatPanelProps> = ({
  messages, isGenerating, inputPrompt, setInputPrompt, handleSendMessage, activeAgentMeta, AGENTS_METADATA
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [colorFront, setColorFront] = useState("#386633");

  useEffect(() => {
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
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  return (
    <div className="bg-white border border-[#d8ebd7] rounded-3xl p-4 md:p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
      <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 chat-scrollbar">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className="flex items-center space-x-2 mb-1 px-1">
              <span className="text-[10px] font-mono font-bold text-[#556258]">
                {msg.sender === "user" ? "You" : (AGENTS_METADATA.find(a => a.id === msg.agentType)?.title || "Specialist")}
              </span>
              <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
            </div>
            <div className={`p-4 rounded-2xl max-w-2xl text-xs md:text-sm leading-relaxed ${msg.sender === "user" ? "bg-[#386633] text-white font-medium rounded-tr-xs shadow-xs" : "bg-[#f8faf8] border border-[#e2ece2] text-[#18211e] rounded-tl-xs shadow-2xs"}`}>
              {msg.sender === "ai" ? (
                <div className="prose prose-sm max-w-none text-[#18211e] prose-headings:font-serif prose-a:text-[#386633] prose-strong:text-[#18211e]">
                  {msg.isStreaming && !msg.text ? (
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
                          style={{ backgroundColor: 'transparent', height: '40px', width: '100px' }} 
                        />
                      </div>
                      <span className="text-[9px] font-mono opacity-50 mt-0.5">Agent Planning Strategy...</span>
                    </div>
                  ) : (
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  )}
                </div>
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 pt-4 border-t border-[#e2e2e2]">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            placeholder={`Ask ${activeAgentMeta.title}...`}
            disabled={isGenerating}
            className="flex-1 bg-[#f8faf8] border border-[#d2d8d3] focus:border-[#386633] rounded-2xl px-4 py-3 text-xs md:text-sm text-[#18211e] placeholder-neutral-400 focus:outline-none transition shadow-2xs"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isGenerating}
            className="p-3 bg-[#386633] hover:bg-[#2c5227] text-white text-xs md:text-sm font-bold rounded-2xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center shrink-0"
            title="Send Message"
            aria-label="Send Message"
          >
            <MaterialIcon icon="send" size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
