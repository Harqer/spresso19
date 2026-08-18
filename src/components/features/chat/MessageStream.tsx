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
                <button
                  onClick={() => {
                    onSelectTryOn({
                      id: `loc-intent-${Date.now()}`,
                      name: m.locationData.title,
                      brand: m.locationData.subtitle || "",
                      price: 0,
                      currency: "USD",
                      category: "Location",
                      description: m.locationData.sectionTitle || "",
                      image: m.locationData.heroImage || "",
                      stock: 0,
                      sku: "LOC",
                      rating: 5.0,
                      virtualTryOnEligible: true,
                      mcpServerId: "spresso-retail"
                    });
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 text-xs font-black uppercase rounded-full transition flex items-center space-x-1.5 shadow-md max-w-max cursor-pointer"
                >
                  <MaterialIcon icon="reviews" size={15} />
                  <span>View Location Details & Reviews</span>
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
};
