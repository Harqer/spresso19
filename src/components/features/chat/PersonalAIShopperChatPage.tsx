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
import { QuickPromptsGrid } from "@/src/components/features/chat/QuickPromptsGrid";
import { MessageStream } from "@/src/components/features/chat/MessageStream";
import { generateDynamicGreeting } from "../../../lib/greeting";
import { DiscoveryRepository } from "../../../lib/discoveryRepository";
import { useConvexAuth, useMutation } from "convex/react";
import { useUIMessages } from "@convex-dev/agent/react";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "../../../lib/convex";

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
}

function textFromConvexParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is { type: "text"; text: string } =>
      Boolean(part) && typeof part === "object" && (part as any).type === "text" && typeof (part as any).text === "string")
    .map((part) => part.text)
    .join("");
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
  const convexAuth = useConvexAuth();
  const createThread = useMutation(api.aiChat.createThread);
  const sendConvexMessage = useMutation(api.aiChat.sendMessage);
  const [convexThreadId, setConvexThreadId] = useState<string | null>(null);
  const convexMessages = useUIMessages(
    api.aiChat.listMessages as any,
    convexThreadId ? { threadId: convexThreadId } : "skip",
    { initialNumItems: 50, stream: true } as any,
  );

  React.useEffect(() => {
    let active = true;
    if (!convexAuth.isAuthenticated || convexThreadId) return;
    createThread({ title: "Spresso discovery" })
      .then((threadId) => { if (active) setConvexThreadId(threadId); })
      .catch((error) => Logger.warn("Unable to start Spresso chat", error));
    return () => { active = false; };
  }, [convexAuth.isAuthenticated, convexThreadId, createThread]);

  const persistedMessages: PersonalChatMsg[] = (convexMessages.results ?? []).map((message: any) => ({
    id: `${message.order}-${message.stepOrder}`,
    sender: message.role === "user" ? "user" : "ai",
    text: textFromConvexParts(message.parts),
    isStreaming: message.status === "streaming",
  }));

  // Generate dynamic time-of-day greeting (e.g., "Good evening.")
  const greeting = generateDynamicGreeting(userName);
  const locationContext = userLocation ? ` near ${userLocation}` : "";

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

    if (convexClient && !convexThreadId) {
      Logger.warn("Convex chat is still initializing; the message was not sent.");
      setMessages((previous) => [...previous, {
        id: `chat-ready-${Date.now()}`,
        sender: "ai",
        text: "I’m getting your chat ready. Please try again in a moment.",
      }]);
      return;
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

    if (convexThreadId) {
      try {
        await sendConvexMessage({ threadId: convexThreadId, prompt: text.trim() });
      } catch (error) {
        Logger.error("Convex shopper chat error:", error);
        setMessages(prev => prev.map((message) => message.id === aiMsgId
          ? { ...message, text: "I’m unable to help with that right now. Please try again.", isStreaming: false }
          : message));
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // Convex Agent is the single in-app chat transport. Do not fall back to
    // a second legacy endpoint: that would duplicate provider spend and make
    // production behavior depend on an unverified Firebase URL.
    setMessages(prev => prev.map(message => message.id === aiMsgId
      ? { ...message, text: "Chat is still connecting. Please try again in a moment.", isStreaming: false }
      : message));
    setIsGenerating(false);
  };


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
        <MessageStream messages={convexThreadId ? persistedMessages : messages} onSelectTryOn={onSelectTryOn} onAddToCart={onAddToCart} />
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
