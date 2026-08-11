import React, { useState } from "react";
import { ProductItem, HITLPayload, ChatMessage } from "../../types";
import { MaterialIcon } from "../MaterialIcon";
import { AIShopperInputBar } from "../AIShopperInputBar";
import { LiveCameraCaptureModal } from "../LiveCameraCaptureModal";
import { CameraObjectDetectionModal } from "../CameraObjectDetectionModal";
import { GoogleLensScreenWidgetModal } from "../GoogleLensScreenWidgetModal";
import { ChatBubbleText } from "../atoms/ChatBubbleText";
import { ChatMessageHeader } from "../molecules/ChatMessageHeader";
import { ChatProductCard } from "../molecules/ChatProductCard";

interface PersonalChatMsg {
  id: string;
  sender: "user" | "ai";
  text: string;
  isStreaming?: boolean;
  products?: ProductItem[];
  locationData?: any;
  audioUrl?: string;
}

interface PersonalAIShopperChatPageProps {
  products: ProductItem[];
  user?: any;
  userName?: string;
  onSelectTryOn: (product: ProductItem) => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
  onAddToCart?: (product: ProductItem) => void;
  deviceMode?: string;
  onOpenVisionSearch?: () => void;
  onSelectTab?: (tabId: string) => void;
  userLocation?: string | null;
  userLatLng?: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  onRequestLocationPermission?: () => void;
  pendingQuery?: { query: string; image?: string | null } | null;
  onClearPendingQuery?: () => void;
  showcaseProduct?: ProductItem | null;
  onClearShowcaseProduct?: () => void;
}

export const PersonalAIShopperChatPage: React.FC<PersonalAIShopperChatPageProps> = ({
  products,
  userName = "Shopper",
  onSelectTryOn,
  onAddToCart,
  userLocation,
  onRequestLocationPermission
}) => {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<PersonalChatMsg[]>([
    { id: "welcome-1", sender: "ai", text: `Hello ${userName}! I'm your Spresso AI Personal Shopper. How can I help you find outfits, ingredients, or local retail deals today?` }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [cameraDetectionOpen, setCameraDetectionOpen] = useState(false);
  const [googleLensOpen, setGoogleLensOpen] = useState(false);

  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setInputQuery("");

    try {
      const historyJson = localStorage.getItem("spresso_search_inquiries");
      const history = historyJson ? JSON.parse(historyJson) : [];
      if (!history.includes(text.trim())) {
        history.unshift(text.trim());
        if (history.length > 20) history.pop();
        localStorage.setItem("spresso_search_inquiries", JSON.stringify(history));
      }
    } catch (e) {}

    const userMsg: PersonalChatMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text
    };

    const aiMsgId = `ai-${Date.now()}`;
    const aiMsg: PersonalChatMsg = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      isStreaming: true
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          userName,
          location: userLocation,
          agentType: "SHOPPING_CONCIERGE"
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (rawData === "[DONE]") break;

            try {
              const parsed = JSON.parse(rawData);
              if (parsed.text) {
                accumulatedText += parsed.text;

                // Parse potential recommended products or location details from JSON block
                const jsonBlock = extractJsonBlock(accumulatedText);
                let recommendedItems: ProductItem[] | undefined = undefined;
                let locationData: any = undefined;

                if (jsonBlock) {
                  if (Array.isArray(jsonBlock.recommendedProducts)) {
                    recommendedItems = jsonBlock.recommendedProducts.map((p: any) => {
                      const match = products.find(cp => cp.id === p.id);
                      return match || {
                        id: p.id || `rec-${Math.random()}`,
                        name: p.name || p.title || "Recommended Item",
                        brand: p.brand || p.source || "Spresso Store",
                        price: parseFloat(p.price || "0"),
                        currency: "USD",
                        category: p.category || "Shopping",
                        description: p.description || "",
                        image: p.image || p.imageUrl || "",
                        stock: 10,
                        sku: `REC-${p.id}`,
                        rating: 5.0,
                        virtualTryOnEligible: true,
                        mcpServerId: "spresso-mcp-retail"
                      };
                    });
                  }
                  if (jsonBlock.locationData) {
                    locationData = jsonBlock.locationData;
                  }
                }

                const cleanText = accumulatedText.replace(/```json\s*[\s\S]*?```/g, "").trim();

                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          text: cleanText || "Analysis complete.",
                          products: recommendedItems,
                          locationData
                        }
                      : m
                  )
                );
              }
            } catch (e) {
              // Ignore partial JSON parse failures during stream
            }
          }
        }
      }

      setMessages(prev =>
        prev.map(m => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch (err) {
      console.error("Personal shopper chat error:", err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                text: "Sorry, I am unable to connect to the Spresso AI Service right now.",
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const extractJsonBlock = (text: string) => {
    try {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (match) {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr.trim());
      }
    } catch (e) {}
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[var(--md-sys-color-surface)]">
      {/* Header Bar */}
      <div className="px-6 py-4 bg-[var(--md-sys-color-surface-container-low)] border-b border-[var(--md-sys-color-outline-variant)] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center shadow-md">
            <MaterialIcon icon="auto_awesome" size={22} />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-[var(--md-sys-color-on-surface)]">AI Personal Shopper</h2>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">{userLocation ? `Shopping near ${userLocation}` : "Global Marketplace"}</p>
          </div>
        </div>

        <button
          onClick={onRequestLocationPermission}
          className="px-3 py-1.5 bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-full text-xs font-semibold border border-[var(--md-sys-color-outline-variant)] transition flex items-center space-x-1.5 cursor-pointer"
        >
          <MaterialIcon icon="location_on" size={14} className="text-[var(--md-sys-color-primary)]" />
          <span>{userLocation || "Set Location"}</span>
        </button>
      </div>

      {/* Message History Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-scrollbar">
        {messages.map(m => (
          <div key={m.id} className="flex flex-col">
            <ChatMessageHeader sender={m.sender} timestamp={new Date().toLocaleTimeString()} />
            <ChatBubbleText message={m} />
            {m.sender === 'ai' && (
              <div className="mt-2 pl-8 space-y-3">
                {m.products && m.products.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    {m.products.map(prod => (
                      <ChatProductCard key={prod.id} product={prod} />
                    ))}
                  </div>
                )}
                {m.locationData && (
                  <button
                    onClick={() => {
                      onSelectTryOn({
                        id: `loc-intent-${Date.now()}`,
                        name: m.locationData.title,
                        brand: m.locationData.subtitle || "AI Identified Location",
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
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[var(--md-sys-color-surface-container-low)] border-t border-[var(--md-sys-color-outline-variant)]">
        <AIShopperInputBar
          value={inputQuery}
          onChange={setInputQuery}
          onSend={() => handleSend(inputQuery)}
          onOpenLiveCamera={() => setLiveCameraOpen(true)}
          onOpenObjectDetection={() => setCameraDetectionOpen(true)}
          onOpenLensWidget={() => setGoogleLensOpen(true)}
        />
      </div>

      {liveCameraOpen && <LiveCameraCaptureModal isOpen={liveCameraOpen} onClose={() => setLiveCameraOpen(false)} onCapture={() => setLiveCameraOpen(false)} />}
      {cameraDetectionOpen && <CameraObjectDetectionModal isOpen={cameraDetectionOpen} onClose={() => setCameraDetectionOpen(false)} onSelectProductListing={onAddToCart} />}
      {googleLensOpen && (
        <GoogleLensScreenWidgetModal
          isOpen={googleLensOpen}
          onClose={() => setGoogleLensOpen(false)}
          onSelectTryOn={onSelectTryOn}
          onAddToCart={onAddToCart}
          onSearchComplete={(text, img) => {
            handleSend(text);
          }}
        />
      )}
    </div>
  );
};
