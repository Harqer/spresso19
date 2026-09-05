import React from "react";
import { ChatBubbleText } from "@/src/components/features/chat/ChatBubbleText";
import { ChatMessageHeader } from "@/src/components/features/chat/ChatMessageHeader";
import { ChatProductCard } from "@/src/components/features/chat/ChatProductCard";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";

interface MessageStreamProps {
  messages: any[];
  onSelectTryOn: (product: ProductItem) => void;
  onAddToCart?: (product: ProductItem) => void;
}

export const MessageStream: React.FC<MessageStreamProps> = ({ messages, onSelectTryOn, onAddToCart }) => {
  return (
    <>
      {messages.map((m: any) => (
        <div key={m.id} className="flex flex-col">
          <ChatMessageHeader sender={m.sender} timestamp={new Date().toLocaleTimeString()} isStreaming={m.isStreaming} />
          <ChatBubbleText message={m} />
          {m.sender === 'ai' && (
            <div className="mt-2 pl-8 space-y-3">
              {m.products && m.products.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  {m.products.map((prod: any) => (
                    <ChatProductCard key={prod.id} product={prod} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />
                  ))}
                </div>
              )}
              {m.locationData && (
                <div className="max-w-lg border-l-2 border-orange-400 pl-3 py-1 text-sm text-[var(--md-sys-color-on-surface)]">
                  <div className="flex items-center gap-2 font-semibold">
                    <MaterialIcon icon="location_on" size={16} className="text-orange-500" />
                    <span>{m.locationData.title}</span>
                  </div>
                  {m.locationData.subtitle && <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">{m.locationData.subtitle}</p>}
                  {m.locationData.sectionTitle && <p className="text-xs mt-1">{m.locationData.sectionTitle}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
