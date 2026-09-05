import Logger from "../../../lib/Logger";
import React, { useState } from "react";
import { ProductItem, HITLPayload } from "../../../types";
import { MaterialIcon } from "../../MaterialIcon";
import { AIShopperInputBar } from "../../AIShopperInputBar";
import { LiveCameraCaptureModal } from "../../LiveCameraCaptureModal";
import { CameraObjectDetectionModal } from "../../CameraObjectDetectionModal";
import { GoogleLensScreenWidgetModal } from "../../GoogleLensScreenWidgetModal";
import { functions } from "../../../lib/firebase";
import { httpsCallable } from "firebase/functions";
import { authFetch } from "../../../lib/firebase";
import { QuickPromptsGrid } from "@/src/components/features/chat/QuickPromptsGrid";
import { MessageStream } from "@/src/components/features/chat/MessageStream";
import { generateDynamicGreeting } from "../../../lib/greeting";
import { DiscoveryRepository } from "../../../lib/discoveryRepository";

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
  discoveryRepository: DiscoveryRepository;
  onListingsChanged: () => void;
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
  discoveryRepository?: unknown;
  onListingsChanged?: () => void;
}

export const PersonalAIShopperChatPage: React.FC<PersonalAIShopperChatPageProps> = ({
  products,
  discoveryRepository,
  onListingsChanged,
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
    const getQuickPrompts = httpsCallable(functions, "getQuickPrompts");
    getQuickPrompts()
      .then((res: any) => {
        if (isMounted && res.data.prompts) setQuickPrompts(res.data.prompts);
      })
      .catch(e => Logger.warn("Failed to fetch quick prompts", e));
    return () => { isMounted = false; };
  }, []);


  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;
    setInputQuery("");

    try {
      const logSearchHistory = httpsCallable(functions, "logSearchHistory");
      logSearchHistory({ query: text.trim() }).catch(e => Logger.warn("Failed to update search history on backend:", e));
    } catch (e) {
      Logger.warn("Failed to initiate search history update:", e);
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

    discoveryRepository.search({ query: text, location: userLocation })
      .then(listings => {
        const verifiedProducts = discoveryRepository.asProducts(listings);
        onListingsChanged();
        setMessages(prev => prev.map(message => message.id === aiMsgId ? { ...message, products: verifiedProducts } : message));
      })
      .catch(error => {
        if (error?.name !== "AbortError") Logger.warn("Verified product discovery failed", error);
      });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await authFetch("https://us-central1-get-spresso.cloudfunctions.net/chatStream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, locale: navigator.language }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok || !response.body) throw new Error(`Chat request failed (${response.status})`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      let accumulatedText = "";

      while (true) {
        if (abortControllerRef.current?.signal.aborted) break;
        const { value, done } = await reader.read();
        pending += value ? decoder.decode(value, { stream: !done }) : "";
        const events = pending.split("\n\n");
        pending = events.pop() || "";
        for (const event of events) {
          const line = event.split("\n").find(item => item.startsWith("data: "));
          if (!line || line === "data: [DONE]") continue;
          let chunk: any;
          try { chunk = JSON.parse(line.slice(6)); } catch { continue; }
          if (chunk.text) {
          accumulatedText += chunk.text;

          const jsonBlock = extractJsonBlock(accumulatedText);
          let locationData: any = undefined;

          if (jsonBlock) {
            if (jsonBlock.locationData) {
              locationData = jsonBlock.locationData;
            }
          }

          const metadataStart = accumulatedText.search(/```json|\{\s*\"(?:recommendedProducts|locationData)\"/);
          const cleanText = (metadataStart >= 0 ? accumulatedText.slice(0, metadataStart) : accumulatedText).trim();

          setMessages(prev =>
            prev.map(m =>
              m.id === aiMsgId
                ? {
                    ...m,
                    text: cleanText,
                    locationData
                  }
                : m
            )
          );
          }
        }
        if (done) break;
      }

      setMessages(prev =>
        prev.map(m => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch (err) {
      Logger.error("Personal AI chat error:", err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                text: "I’m unable to help with that right now. Please try again.",
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
      Logger.warn("Failed to extract JSON block from AI output");
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
          <QuickPromptsGrid quickPrompts={quickPrompts} onSelectPrompt={(prompt: string) => handleSend(prompt)} />
        </div>

        {/* Message Stream */}
        <MessageStream messages={messages} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />
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
