import React, { useState } from "react";
import { ProductItem, HITLPayload } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { AIShopperInputBar } from "../../AIShopperInputBar";
import { LiveCameraCaptureModal } from "../../LiveCameraCaptureModal";
import { CameraObjectDetectionModal } from "../../CameraObjectDetectionModal";
import { GoogleLensScreenWidgetModal } from "../../GoogleLensScreenWidgetModal";
import { authFetch } from "../../../lib/firebase";
import { ChatBubbleText } from "@/src/components/features/chat/ChatBubbleText";
import { ChatMessageHeader } from "@/src/components/features/chat/ChatMessageHeader";
import { ChatProductCard } from "@/src/components/features/chat/ChatProductCard";
import { generateDynamicGreeting } from "../../../lib/greeting";

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
  userName = "Guest Member",
  onSelectTryOn,
  onAddToCart,
  userLocation,
  onRequestLocationPermission
}) => {
  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<PersonalChatMsg[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [cameraDetectionOpen, setCameraDetectionOpen] = useState(false);
  const [googleLensOpen, setGoogleLensOpen] = useState(false);

  // Generate dynamic time-of-day greeting (e.g., "Good evening.")
  const greeting = generateDynamicGreeting(userName);
  const locationContext = userLocation ? ` near ${userLocation}` : "";
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const [quickPrompts, setQuickPrompts] = useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    authFetch("/api/chat/quick-prompts")
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.prompts) setQuickPrompts(data.prompts);
      })
      .catch(e => console.warn("Failed to fetch quick prompts", e));
    return () => { isMounted = false; };
  }, []);


  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setInputQuery("");

    try {
      authFetch("/api/user/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim() })
      }).catch(e => console.warn("Failed to update search history on backend:", e));
    } catch (e) {
      console.warn("Failed to initiate search history update:", e);
    }

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await authFetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          userName,
          location: userLocation,
          agentType: "SHOPPING_CONCIERGE"
        }),
        signal: abortControllerRef.current.signal
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

                const jsonBlock = extractJsonBlock(accumulatedText);
                let recommendedItems: ProductItem[] | undefined = undefined;
                let locationData: any = undefined;

                if (jsonBlock) {
                  if (Array.isArray(jsonBlock.recommendedProducts)) {
                    // Collect unknown product IDs
                    const unknownIds = jsonBlock.recommendedProducts
                      .filter((p: any) => !products.some(cp => cp.id === p.id))
                      .map((p: any) => p.id);
                    
                    if (unknownIds.length > 0) {
                      // Fetch full product details for unknown IDs
                      try {
                        const { httpsCallable } = await import("firebase/functions");
                        const { functions } = await import("../../../lib/firebase");
                        const fetchProducts = httpsCallable(functions, "fetchProductsByIds");
                        const res = await fetchProducts({ ids: unknownIds });
                        const fetchedProducts = (res.data as any).products || [];
                        
                        recommendedItems = jsonBlock.recommendedProducts.map((p: any) => {
                          const match = products.find(cp => cp.id === p.id) || fetchedProducts.find((cp: any) => cp.id === p.id);
                          return match || null;
                        }).filter(Boolean);
                      } catch (e) {
                        console.warn("Failed to fetch full product details", e);
                        recommendedItems = jsonBlock.recommendedProducts.map((p: any) => {
                          const match = products.find(cp => cp.id === p.id);
                          return match;
                        }).filter(Boolean);
                      }
                    } else {
                      recommendedItems = jsonBlock.recommendedProducts.map((p: any) => {
                        const match = products.find(cp => cp.id === p.id);
                        return match;
                      }).filter(Boolean);
                    }
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
              console.warn("Failed to parse SSE JSON chunk");
            }
          }
        }
      }

      setMessages(prev =>
        prev.map(m => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch (err) {
      console.error("Personal AI chat error:", err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                text: "Sorry, I am unable to connect to the Spresso Service right now.",
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
    } catch (e) {
      console.warn("Failed to extract JSON block from AI output");
    }
    return null;
  };

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[var(--md-sys-color-surface)]">
      {/* Main Chat & Discovery Hero Card Scroll Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-scrollbar">
        {/* Dynamic Time-of-Day Greeting Hero Card matching user reference screenshot */}
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[var(--md-sys-color-on-surface)] tracking-tight">
            {greeting.timeGreetingHeader}
          </h1>

          {/* 4 Quick Discovery Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl text-left">
            {quickPrompts.map((card) => (
              <div
                key={card.id}
                onClick={() => handleSend(card.prompt)}
                className="group p-5 bg-white dark:bg-[#141719] border border-[#e0e4db] dark:border-[#22272a] hover:border-[#386633] dark:hover:border-[#9cd695] rounded-3xl transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-[#f4f7f3] dark:bg-[#1a211a] text-[#386633] dark:text-[#9cd695] flex items-center justify-center">
                    <MaterialIcon icon={card.icon} size={18} />
                  </div>
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${card.badgeBg}`}>
                    {card.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--md-sys-color-on-surface)] group-hover:text-[#386633] dark:group-hover:text-[#9cd695] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] leading-snug mt-1">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        {messages.map(m => (
          <div key={m.id} className="flex flex-col">
            <ChatMessageHeader sender={m.sender} timestamp={new Date().toLocaleTimeString()} isStreaming={m.isStreaming} />
            <ChatBubbleText message={m} />
            {m.sender === 'ai' && (
              <div className="mt-2 pl-8 space-y-3">
                {m.products && m.products.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                    {m.products.map(prod => (
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
      </div>

      {/* Input Bar */}
      <div className="p-4 bg-[var(--md-sys-color-surface-container-low)]">
        <AIShopperInputBar
          value={inputQuery}
          onChange={setInputQuery}
          onSend={(text) => handleSend(text)}
          onSelectTryOn={onSelectTryOn}
          onAddToCart={onAddToCart}
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
          onSearchComplete={(text) => {
            handleSend(text);
          }}
        />
      )}
    </div>
  );
};
