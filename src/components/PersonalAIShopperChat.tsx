import React, { useState, useRef, useMemo, useEffect } from "react";
import { ProductItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { SpressoLogo } from "./SpressoLogo";
import { generateDynamicGreeting } from "../lib/greeting";
import { getCleanLocationName } from "../lib/location";
import { LiveCameraCaptureModal } from "./LiveCameraCaptureModal";
import { CameraObjectDetectionModal } from "./CameraObjectDetectionModal";
import { GoogleLensScreenWidgetModal } from "./GoogleLensScreenWidgetModal";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { InteractiveVisualShowcase } from "./InteractiveVisualShowcase";

interface PersonalAIShopperChatProps {
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
  userLatLng?: { latitude: number; longitude: number } | null;
  searchRadius?: number;
  onRadiusChange?: (radius: number) => void;
  onRequestLocationPermission?: () => void;
  pendingQuery?: { query: string; image?: string | null } | null;
  onClearPendingQuery?: () => void;
  showcaseProduct?: ProductItem | null;
  onClearShowcaseProduct?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  thoughts?: string;
  timestamp: string;
  imageUrl?: string;
  recommendedProducts?: ProductItem[];
  searchQueries?: string[];
  groundingSources?: Array<{ title: string; uri: string }>;
  visualShowcaseProduct?: ProductItem;
}

const getCategoryPhoto = (name: string, category: string = ""): string => {
  const n = (name + " " + category).toLowerCase();
  
  // Specific item matching
  if (n.includes("egg")) return "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=600&auto=format&fit=crop"; // Brown egg carton
  if (n.includes("bacon") || n.includes("pork") || n.includes("ham") || n.includes("sausage") || n.includes("meat")) return "https://images.unsplash.com/photo-1528607929212-2636ec44253e?w=600&auto=format&fit=crop"; // Smoked bacon strips
  if (n.includes("sauce") || n.includes("tabasco") || n.includes("cholula") || n.includes("frank") || n.includes("chili") || n.includes("hot sauce") || n.includes("pepper")) return "https://images.unsplash.com/photo-1588615419955-5228fe1c203f?w=600&auto=format&fit=crop"; // Hot sauce bottle
  if (n.includes("coffee") || n.includes("espresso") || n.includes("latte") || n.includes("bean")) return "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop"; // Coffee beans & cup
  if (n.includes("bread") || n.includes("toast") || n.includes("bakery") || n.includes("bagel")) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop"; // Fresh bread
  if (n.includes("butter")) return "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop"; // Block of butter
  if (n.includes("milk") || n.includes("dairy")) return "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop"; // Fresh milk
  if (n.includes("cheese")) return "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&auto=format&fit=crop"; // Gourmet cheese
  if (n.includes("apple") || n.includes("fruit") || n.includes("berry") || n.includes("banana") || n.includes("avocado")) return "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop"; // Produce
  if (n.includes("grocery") || n.includes("snack") || n.includes("food") || n.includes("market")) return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop";
  if (n.includes("shirt") || n.includes("jacket") || n.includes("coat") || n.includes("parka") || n.includes("pants") || n.includes("dress") || n.includes("apparel") || n.includes("wear") || n.includes("loungewear")) return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop";
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("boot") || n.includes("runner")) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop";
  if (n.includes("watch") || n.includes("ring") || n.includes("glasses") || n.includes("headphone") || n.includes("tech") || n.includes("camera") || n.includes("gadget")) return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop";
  return "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop";
};

export const PersonalAIShopperChat: React.FC<PersonalAIShopperChatProps> = ({
  products,
  user,
  userName,
  onSelectTryOn,
  onRequestHITLCheckout,
  onAddToCart,
  onOpenVisionSearch,
  onSelectTab,
  userLocation,
  userLatLng: initialUserLatLng,
  searchRadius = 25,
  onRadiusChange,
  onRequestLocationPermission,
  pendingQuery,
  onClearPendingQuery,
  showcaseProduct,
  onClearShowcaseProduct
}) => {
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [liveCameraOpen, setLiveCameraOpen] = useState(false);
  const [cameraDetectionOpen, setCameraDetectionOpen] = useState(false);
  const [googleLensOpen, setGoogleLensOpen] = useState(false);
  const [expandedThoughtIds, setExpandedThoughtIds] = useState<Record<string, boolean>>({});
  const [addedToCartId, setAddedToCartId] = useState<string | null>(null);
  const [likedProductIds, setLikedProductIds] = useState<Record<string, boolean>>({});
  const [bookmarkedProductIds, setBookmarkedProductIds] = useState<Record<string, boolean>>({});
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [productViewModes, setProductViewModes] = useState<Record<string, "horizontal" | "vertical">>({});
  const [active360ProductId, setActive360ProductId] = useState<string | null>(null);
  const [rotationAngles, setRotationAngles] = useState<Record<string, number>>({});
  const [shoppingMode, setShoppingMode] = useState<"web" | "store">("web");
  const [userLatLng, setUserLatLng] = useState<{ latitude: number; longitude: number } | null>(initialUserLatLng || null);
  const [locationName, setLocationName] = useState<string | null>(userLocation || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bi-directional Voice Mode state and refs
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef(false);

  useEffect(() => {
    isVoiceActiveRef.current = isVoiceActive;
  }, [isVoiceActive]);

  useEffect(() => {
    if (pendingQuery && (pendingQuery.query || pendingQuery.image)) {
      const q = pendingQuery.query;
      const img = pendingQuery.image;
      if (onClearPendingQuery) onClearPendingQuery();
      handleSendMessage(q, img);
    }
  }, [pendingQuery]);

  useEffect(() => {
    if (showcaseProduct) {
      const newMsg: ChatMessage = {
        id: `showcase-${Date.now()}`,
        sender: "ai",
        text: `**8K ELM-Optimized Virtual Try-On & Cinematic Video Showcase** generated for **${showcaseProduct.name}** ($${showcaseProduct.price.toFixed(2)}). You can customize studio atmosphere, motion profiles, and lighting in real time below!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        visualShowcaseProduct: showcaseProduct
      };
      setMessages(prev => [...prev, newMsg]);
      if (onClearShowcaseProduct) onClearShowcaseProduct();
    }
  }, [showcaseProduct]);

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*#_~`]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    if (!cleanText) {
      if (isVoiceActiveRef.current) startListening();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha") || v.name.includes("Karen"))
    ) || voices.find(v => v.lang.startsWith("en"));
    if (englishVoice) utterance.voice = englishVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (isVoiceActiveRef.current) {
        startListening();
      }
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (isVoiceActiveRef.current) {
        startListening();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser environment.");
      setIsVoiceActive(false);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        setInputQuery(interimTranscript);
      }

      if (finalTranscript) {
        setInputQuery(finalTranscript);
        handleSendMessage(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to start speech recognition:", e);
    }
  };

  const stopVoiceMode = () => {
    setIsVoiceActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const toggleVoiceMode = () => {
    if (isVoiceActive) {
      stopVoiceMode();
    } else {
      setIsVoiceActive(true);
      startListening();
    }
  };

  React.useEffect(() => {
    if (userLocation) setLocationName(userLocation);
  }, [userLocation]);

  React.useEffect(() => {
    if (initialUserLatLng) setUserLatLng(initialUserLatLng);
  }, [initialUserLatLng]);

  const displayLocation = useMemo(() => {
    const loc = locationName || userLocation;
    if (!loc) return null;
    if (loc.includes("Lat ") || loc.match(/Near\s+-?\d+\.\d+/i) || loc.match(/-?\d+\.\d+,\s*-?\d+\.\d+/)) {
      if (loc.includes("San Francisco")) return "San Francisco, CA";
      return "Current Location";
    }
    return loc;
  }, [locationName, userLocation]);

  const requestDeviceLocation = () => {
    if (onRequestLocationPermission) {
      onRequestLocationPermission();
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
          setUserLatLng(coords);
          const cleanName = await getCleanLocationName(pos.coords.latitude, pos.coords.longitude);
          setLocationName(cleanName);
        },
        (err) => {
          console.warn("Location permission requested but unavailable:", err);
        }
      );
    }
  };

  const toggleLike = (productId: string) => {
    setLikedProductIds(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  const toggleBookmark = (productId: string) => {
    setBookmarkedProductIds(prev => {
      const isSaved = !!prev[productId];
      const next = { ...prev, [productId]: !isSaved };
      try {
        const savedList = Object.keys(next).filter(id => next[id]);
        localStorage.setItem("spresso_wardrobe_items", JSON.stringify(savedList));
      } catch (err) {
        console.error("Failed to update wardrobe items from chat", err);
      }
      return next;
    });
  };

  const handleShareProduct = (product: ProductItem) => {
    const shareText = `Check out ${product.name} on Spresso AI ($${product.price})!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedShareId(product.id);
      setTimeout(() => setCopiedShareId(null), 2000);
    }
  };

  const renderInlineFormatting = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|==[^=]+==|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={i} className="font-bold text-[#18211e] tracking-[0.015em]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("==") && part.endsWith("==") && part.length >= 4) {
        return (
          <mark key={i} className="bg-[#386633]/15 text-[#2c5227] px-1.5 py-0.5 rounded font-semibold">
            {part.slice(2, -2)}
          </mark>
        );
      }
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code key={i} className="font-mono text-[12px] bg-[#e8f3e8] text-[#2c5227] px-1.5 py-0.5 rounded border border-[#cde0cc]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const formatMessageText = (text: string) => {
    if (!text) return null;

    // Split text into block paragraphs by double line breaks
    const blocks = text.split(/\n\n+/);

    return (
      <div className="space-y-3.5 chat-response-body">
        {blocks.map((block, bIdx) => {
          const trimmed = block.trim();
          if (!trimmed) return null;

          // Check if block is a heading (starts with #, ##, ###)
          if (trimmed.startsWith("#")) {
            const headingText = trimmed.replace(/^#+\s*/, "");
            return (
              <h3 key={bIdx} className="font-serif text-[19px] sm:text-[21px] font-normal leading-snug text-[#18211e] tracking-tight mt-3 mb-1 border-b border-[#e2e2e2]/40 pb-1">
                {headingText}
              </h3>
            );
          }

          // Check if block represents a bullet list or numbered list
          const lines = trimmed.split("\n");
          if (lines.length > 1 && lines.some(l => l.trim().startsWith("- ") || l.trim().startsWith("* ") || /^\d+\.\s/.test(l.trim()))) {
            return (
              <div key={bIdx} className="space-y-2 my-2">
                {lines.map((line, lIdx) => {
                  const lineTrimmed = line.trim();
                  const isBullet = lineTrimmed.startsWith("- ") || lineTrimmed.startsWith("* ");
                  const isNumbered = /^\d+\.\s/.test(lineTrimmed);
                  const cleanLine = lineTrimmed.replace(/^([-*]|\d+\.)\s*/, "");

                  return (
                    <div key={lIdx} className="flex items-start space-x-2.5 text-[13.5px] sm:text-[14px] leading-relaxed tracking-[0.012em]">
                      {isBullet && <span className="w-1.5 h-1.5 rounded-full bg-[#386633] mt-2 shrink-0" />}
                      {isNumbered && <span className="text-[12px] font-bold text-[#386633] shrink-0 font-mono mt-0.5">{lineTrimmed.match(/^\d+\./)?.[0]}</span>}
                      <div className="flex-1">{renderInlineFormatting(cleanLine)}</div>
                    </div>
                  );
                })}
              </div>
            );
          }

          // Single standalone bold title heading check (e.g., **Visual Contrast**)
          if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.slice(2, -2).includes("\n") && trimmed.length < 80) {
            return (
              <h4 key={bIdx} className="font-serif text-[18px] sm:text-[20px] font-normal text-[#18211e] tracking-tight mt-2.5 mb-1">
                {trimmed.slice(2, -2)}
              </h4>
            );
          }

          // Regular paragraph with inline formatting
          return (
            <p key={bIdx} className="text-[13.5px] sm:text-[14px] leading-[1.75] tracking-[0.012em] text-[#1a1c1c]">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatting(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </div>
    );
  };

  const activeUserName = useMemo(() => {
    if (userName && userName.trim() && !["shopper", "guest shopper"].includes(userName.trim().toLowerCase())) {
      return userName.trim();
    }
    if (user?.displayName && user.displayName.trim()) {
      return user.displayName.split(" ")[0];
    }
    if (user?.email && user.email.includes("@")) {
      return user.email.split("@")[0];
    }
    if (user?.uid) {
      return `User_${user.uid.slice(0, 5)}`;
    }
    return "";
  }, [userName, user]);
  const greetingContext = useMemo(() => generateDynamicGreeting(activeUserName), [activeUserName]);

  // Initial Conversation State (Empty until user initiates)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const toggleThoughts = (msgId: string) => {
    setExpandedThoughtIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = async (textToSend?: string, imageToSend?: string | null) => {
    const query = textToSend !== undefined ? textToSend : inputQuery;
    const currentImg = imageToSend !== undefined ? imageToSend : attachedImage;
    if (!query.trim() && !currentImg) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query || "Visual Camera Search Query",
      imageUrl: currentImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: ChatMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      thoughts: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    setInputQuery("");
    setAttachedImage(null);
    setIsTyping(true);

    // Save search intent to local storage history for personalized web search feed
    try {
      const existing = JSON.parse(localStorage.getItem("spresso_search_history") || "[]");
      const updated = [query, ...existing.filter((q: string) => q !== query)].slice(0, 10);
      localStorage.setItem("spresso_search_history", JSON.stringify(updated));
    } catch (e) {}

    // Intent detection for AI "buy this for me", "buy 2 of this", "order this"
    const lowerQ = (query || "").toLowerCase();
    const isBuyIntent = lowerQ.includes("buy") || lowerQ.includes("purchase") || lowerQ.includes("order") || lowerQ.includes("checkout");
    if (isBuyIntent) {
      const qtyMatch = lowerQ.match(/(?:buy|order|purchase|add)\s+(\d+)/) || lowerQ.match(/(\d+)\s+(?:of|items?|pairs?|units?|quantity|qty)/);
      const reqQty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;

      const promptTokens = lowerQ.split(/\s+/).filter(t => t.length > 2 && !["what", "where", "how", "the", "and", "for", "with", "can", "you", "show", "recommend", "buy", "purchase", "this", "me", "order", "get", "please"].includes(t));
      
      let targetProd: ProductItem | undefined;
      if (promptTokens.length > 0) {
        targetProd = products.find(p => {
          const n = p.name.toLowerCase();
          const b = p.brand.toLowerCase();
          return promptTokens.some(t => n.includes(t) || b.includes(t));
        });
      }

      if (!targetProd && messages.length > 0) {
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].recommendedProducts && messages[i].recommendedProducts!.length > 0) {
            targetProd = messages[i].recommendedProducts![0];
            break;
          }
        }
      }

      if (!targetProd && products.length > 0) {
        targetProd = products[0];
      }

      if (targetProd) {
        setTimeout(() => {
          triggerCheckout(targetProd!, reqQty);
        }, 800);
      }
    }

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          imageBase64: currentImg || undefined,
          location: locationName || userLocation || undefined,
          latLng: userLatLng || undefined,
          searchRadius: searchRadius,
          shoppingMode: shoppingMode,
          userName: greetingContext.userName,
          userId: user?.uid,
          timeBlock: greetingContext.timeBlock,
          currentTime: greetingContext.currentTime,
          currentDate: greetingContext.currentDate,
          dayOfWeek: greetingContext.dayOfWeek,
          timeZone: greetingContext.timeZone
        })
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.replace(/^data:\s*/, ""));

              if (data.type === "thought" && data.text) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? { ...msg, thoughts: (msg.thoughts || "") + data.text }
                      : msg
                  )
                );
              } else if (data.type === "text" && data.text) {
                accumulatedText += data.text;
                
                // Cleanly strip any raw ```json code blocks from user-visible chat text
                let cleanText = accumulatedText;
                let dynamicProducts: ProductItem[] = [];

                if (cleanText.includes("```json") || cleanText.includes('"recommendedProducts"')) {
                  const jsonBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
                  if (jsonBlockMatch && jsonBlockMatch[1]) {
                    try {
                      const parsed = JSON.parse(jsonBlockMatch[1]);
                      const prods = parsed.recommendedProducts || parsed.products;
                      if (Array.isArray(prods) && prods.length > 0) {
                        dynamicProducts = prods.map((p: any, idx: number) => ({
                          id: p.id || `gen-prod-${Date.now()}-${idx}`,
                          name: p.name || "Recommended Item",
                          brand: p.brand || "Spresso Curated",
                          price: typeof p.price === "number" ? p.price : parseFloat(p.price) || 9.99,
                          currency: p.currency || "$",
                          stock: typeof p.stock === "number" ? p.stock : 15,
                          sku: p.sku || `SKU-DYN-${Date.now()}-${idx}`,
                          rating: typeof p.rating === "number" ? p.rating : 4.8,
                          category: p.category || "Marketplace",
                          description: p.description || "Curated based on your request and live search research.",
                          image: p.image && p.image.startsWith("http")
                            ? p.image
                            : getCategoryPhoto(p.name || "", p.category || ""),
                          virtualTryOnEligible: true,
                          mcpServerId: "spresso-mcp-retail"
                        }));
                      }
                    } catch (e) {
                      // Incomplete JSON chunk during stream
                    }
                    cleanText = cleanText.replace(/```(?:json)?[\s\S]*?(?:```|$)/, "").trim();
                  }
                }

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? {
                          ...msg,
                          text: cleanText,
                          ...(dynamicProducts.length > 0 ? { recommendedProducts: dynamicProducts } : {})
                        }
                      : msg
                  )
                );
              } else if (data.type === "search_queries" && data.queries) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? { ...msg, searchQueries: data.queries }
                      : msg
                  )
                );
              } else if (data.type === "grounding_sources" && data.sources) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? { ...msg, groundingSources: data.sources }
                      : msg
                  )
                );
              }
            } catch (err) {
              console.warn("Error parsing stream SSE line:", err);
            }
          }
        }
      }

      // Final pass on stream completion to ensure all JSON blocks are extracted and clean
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id !== aiMsgId) return msg;

          let finalText = msg.text || "";
          let finalProducts = msg.recommendedProducts || [];

          // If products were not extracted yet, perform deep regex search
          if (finalProducts.length === 0 && (finalText.includes("```json") || finalText.includes('"recommendedProducts"'))) {
            const jsonBlockMatch = finalText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonBlockMatch && jsonBlockMatch[1]) {
              try {
                const parsed = JSON.parse(jsonBlockMatch[1]);
                const prods = parsed.recommendedProducts || parsed.products;
                if (Array.isArray(prods) && prods.length > 0) {
                  finalProducts = prods.map((p: any, idx: number) => ({
                    id: p.id || `gen-prod-${Date.now()}-${idx}`,
                    name: p.name || "Recommended Item",
                    brand: p.brand || "Spresso Curated",
                    price: typeof p.price === "number" ? p.price : parseFloat(p.price) || 9.99,
                    currency: p.currency || "$",
                    stock: typeof p.stock === "number" ? p.stock : 15,
                    sku: p.sku || `SKU-DYN-${Date.now()}-${idx}`,
                    rating: typeof p.rating === "number" ? p.rating : 4.8,
                    category: p.category || "Marketplace",
                    description: p.description || "Curated based on your request and live search research.",
                    image: p.image && p.image.startsWith("http")
                      ? p.image
                      : getCategoryPhoto(p.name || "", p.category || ""),
                    virtualTryOnEligible: true,
                    mcpServerId: "spresso-mcp-retail"
                  }));
                  finalText = finalText.replace(jsonBlockMatch[0], "").trim();
                }
              } catch (e) {
                console.warn("JSON parse on complete stream failed:", e);
              }
            }
          }

          // Bullet point fallback parser if no structured JSON was provided
          if (finalProducts.length === 0 && finalText) {
            const lines = finalText.split("\n");
            const parsedItems: ProductItem[] = [];

            for (const line of lines) {
              const trimmed = line.trim();
              const priceMatch = trimmed.match(/^(?:[*•-]|(?:\d+\.))\s*(?:\*\*)?([^*:\n-]+)(?:\*\*)?.*?(?:\$|USD\s*)([0-9]+\.?[0-9]{0,2})/i);
              if (priceMatch && priceMatch[1] && priceMatch[2]) {
                const prodName = priceMatch[1].replace(/[*_#]/g, "").trim();
                const prodPrice = parseFloat(priceMatch[2]);
                if (prodName.length > 2 && prodPrice > 0) {
                  parsedItems.push({
                    id: `parsed-prod-${Date.now()}-${parsedItems.length}`,
                    name: prodName,
                    brand: "Spresso Local Merchant",
                    price: prodPrice,
                    currency: "$",
                    stock: 25,
                    sku: `SKU-PARSE-${Date.now()}-${parsedItems.length}`,
                    rating: 4.8,
                    category: "Marketplace",
                    description: "Available from local retailers and delivery services.",
                    image: getCategoryPhoto(prodName, "Grocery"),
                    virtualTryOnEligible: true,
                    mcpServerId: "spresso-mcp-retail"
                  });
                }
              }
            }

            if (parsedItems.length > 0) {
              finalProducts = parsedItems.slice(0, 4);
            }
          }

          // Contextual query token search if no products extracted yet
          const q = query.toLowerCase();

          if (finalProducts.length === 0) {
            const promptTokens = q.split(/\s+/).filter(t => t.length > 2 && !["what", "where", "how", "the", "and", "for", "with", "can", "you", "show", "recommend", "looking", "find"].includes(t));
            
            const matchedCatalog = products.filter(p => {
              const nameLower = p.name.toLowerCase();
              const catLower = p.category.toLowerCase();
              const brandLower = p.brand.toLowerCase();
              const descLower = p.description.toLowerCase();
              return promptTokens.some(t => 
                nameLower.includes(t) || catLower.includes(t) || brandLower.includes(t) || descLower.includes(t)
              );
            });

            if (matchedCatalog.length > 0) {
              finalProducts = matchedCatalog.slice(0, 3);
            }
          }

          if (isVoiceActiveRef.current && finalText) {
            speakText(finalText);
          }

          return {
            ...msg,
            text: finalText,
            recommendedProducts: finalProducts
          };
        })
      );
    } catch (err) {
      console.error("Error streaming query:", err);
      if (isVoiceActiveRef.current) {
        speakText("I've found some top recommendations tailored to your request.");
      }
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMsgId
            ? {
                ...msg,
                text: "Here are top recommendations tailored to your request:",
                recommendedProducts: products.slice(0, 3)
              }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const triggerCheckout = (product: ProductItem, customQty?: number) => {
    const qty = customQty && customQty > 0 ? customQty : 1;
    const total = product.price * qty;
    const displayName = product.name.includes("(") ? product.name : `${product.name} (Qty: ${qty})`;

    const payload: HITLPayload = {
      authorizationId: `ORDER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: product.id,
        name: displayName,
        price: product.price,
        sku: product.sku || `SKU-${product.id}`,
        image: product.image
      },
      quantity: qty,
      totalAmount: total,
      currency: product.currency || "USD",
      deviceSource: "WEB",
      inventoryConfirmed: product.stock >= qty,
      stockRemaining: product.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Purchase",
        message: `Authorize $${total.toFixed(2)} for ${displayName}?`,
        safetyChecks: [
          "In-stock and reserved for 5 minutes",
          "Includes free express delivery",
          "Biometric authorization required before payment"
        ]
      }
    };

    onRequestHITLCheckout(payload);
  };

  return (
    <div className="w-full max-w-[800px] mx-auto min-h-[calc(100vh-7rem)] flex flex-col justify-between space-y-4">
      {/* Chat Messages Stream or Clean Centered Greeting */}
      <div className="flex-1 flex flex-col justify-center space-y-6 overflow-y-auto pr-1 chat-scrollbar pb-6">
        {messages.length === 0 ? (
          <div className="relative flex-1 flex flex-col items-center justify-center my-auto py-12 text-center space-y-6 select-none animate-fadeIn overflow-hidden rounded-3xl">
            {/* Background Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none select-none z-0 overflow-hidden">
              <SpressoLogo variant="full" size="xl" className="scale-[5.5] sm:scale-[7] md:scale-[8.5] transition-none max-w-none transform -translate-y-1 shrink-0" />
            </div>

            {/* Content sitting in front of background logo */}
            <div className="relative z-10 space-y-2 max-w-md px-4">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#18211e] tracking-tight drop-shadow-2xs">
                {greetingContext.timeGreetingHeader}
              </h1>
            </div>

            {/* Hyper-Personalized Discovery Cards Grounded in Location & Interests (Google Model Garden Architecture) */}
            <div className="relative z-10 w-full max-w-xl px-4 pt-1 space-y-3">
              {/* 4 Interactive Personalized Discovery Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                {/* Card 1: Hot Brand Drops */}
                <button
                  onClick={() => handleSendMessage(`Find hot new Nike, Jordan, and sneaker drops at local stores within ${searchRadius} miles of ${locationName || userLocation || "me"}`)}
                  className="p-3.5 bg-white hover:bg-[#f6f9f6] border border-[#e2e2e2] hover:border-[#386633]/60 rounded-2xl transition transform active:scale-[0.99] text-left cursor-pointer shadow-2xs group flex flex-col justify-between space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                      <MaterialIcon icon="local_fire_department" size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                      Hot Drop
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">
                      Nike & Brand Drops
                    </h4>
                    <p className="text-[11px] text-[#556258] leading-tight mt-0.5">
                      {locationName || userLocation ? `Releases within ${searchRadius} miles of ${locationName || userLocation}` : "Check local sneaker releases & store stock drops"}
                    </p>
                  </div>
                </button>

                {/* Card 2: Local Store Deals */}
                <button
                  onClick={() => handleSendMessage(`Compare top product sales, discounts and 20%+ off clearance deals at stores within ${searchRadius} miles of ${locationName || userLocation || "my area"} to find the best savings`)}
                  className="p-3.5 bg-white hover:bg-[#f6f9f6] border border-[#e2e2e2] hover:border-[#386633]/60 rounded-2xl transition transform active:scale-[0.99] text-left cursor-pointer shadow-2xs group flex flex-col justify-between space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold">
                      <MaterialIcon icon="sell" size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                      20%+ Off
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">
                      Area Store & Outlet Deals
                    </h4>
                    <p className="text-[11px] text-[#556258] leading-tight mt-0.5">
                      {locationName || userLocation ? `Compare store deals across ${searchRadius} mi radius` : "Discover top local & outlet sales"}
                    </p>
                  </div>
                </button>

                {/* Card 3: Fresh Grocery & Market Steals */}
                <button
                  onClick={() => handleSendMessage(`Find on-sale organic grocery items, fresh produce, and supermarket specials within a ${searchRadius}-mile radius of ${locationName || userLocation || "me"}`)}
                  className="p-3.5 bg-white hover:bg-[#f6f9f6] border border-[#e2e2e2] hover:border-[#386633]/60 rounded-2xl transition transform active:scale-[0.99] text-left cursor-pointer shadow-2xs group flex flex-col justify-between space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
                      <MaterialIcon icon="shopping_cart" size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                      Market Steals
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">
                      Fresh Grocery Deals
                    </h4>
                    <p className="text-[11px] text-[#556258] leading-tight mt-0.5">
                      {locationName || userLocation ? `Supermarket deals within ${searchRadius} mi` : "Weekly grocery specials & local produce sales"}
                    </p>
                  </div>
                </button>

                {/* Card 4: Trending Tech & Style */}
                <button
                  onClick={() => handleSendMessage(`Recommend trending tech accessories, audio gear and seasonal style available within ${searchRadius} miles of ${locationName || userLocation || "me"}`)}
                  className="p-3.5 bg-white hover:bg-[#f6f9f6] border border-[#e2e2e2] hover:border-[#386633]/60 rounded-2xl transition transform active:scale-[0.99] text-left cursor-pointer shadow-2xs group flex flex-col justify-between space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-bold">
                      <MaterialIcon icon="auto_awesome" size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
                      Trending
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">
                      Trending Tech & Style
                    </h4>
                    <p className="text-[11px] text-[#556258] leading-tight mt-0.5">
                      {locationName || userLocation ? `Popular style & gear in ${searchRadius} mi area` : "Popular fashion picks & audio accessories near you"}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex fade-in ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[88%] space-y-2 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                {/* AI Clean Customer Loading Indicator */}
                {msg.sender === "ai" && isTyping && !msg.text && (
                  <div className="flex items-center space-x-2 text-xs text-[#386633] font-medium py-1.5 px-3 bg-emerald-50/80 rounded-xl border border-emerald-200/60 w-fit mb-1">
                    <MaterialIcon icon="auto_awesome" size={15} className="animate-spin text-emerald-600" />
                    <span>Finding recommendations...</span>
                  </div>
                )}

                <div
                  className={`px-6 py-5 rounded-2xl transition-all ${
                    msg.sender === "user"
                      ? "bg-white border border-[#e2e2e2] text-[#18211e] rounded-tr-none shadow-xs font-medium text-[13.5px] leading-relaxed tracking-[0.012em]"
                      : "bg-white/95 border border-[#e2e2e2]/80 text-[#1a1c1c] rounded-tl-none shadow-xs ai-message-gradient"
                  }`}
                >
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Attached query" className="w-52 h-38 object-cover rounded-xl mb-3 border border-[#e2e2e2]" />
                  )}

                  {msg.text ? (
                    <div>{formatMessageText(msg.text)}</div>
                  ) : (
                    isTyping && msg.sender === "ai" && (
                      <div className="flex items-center space-x-1.5 py-1 text-[#386633]">
                        <span className="w-2 h-2 bg-emerald-600 rounded-full animate-ping"></span>
                        <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
                      </div>
                    )
                  )}

                  {/* Interactive Location Set Prompt Card when location is requested */}
                  {msg.sender === "ai" && !userLocation && !userLatLng && (msg.text.toLowerCase().includes("location") || msg.text.toLowerCase().includes("city") || msg.text.toLowerCase().includes("zip code") || msg.text.toLowerCase().includes("near you") || msg.text.toLowerCase().includes("stores near")) && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between space-x-3 shadow-xs">
                      <div className="flex items-center space-x-2 text-xs text-emerald-950 font-medium">
                        <MaterialIcon icon="my_location" size={18} className="text-emerald-700 animate-pulse" />
                        <span>Share your location or ZIP to view nearby stores & stock</span>
                      </div>
                      <button
                        onClick={() => onRequestLocationPermission && onRequestLocationPermission()}
                        className="px-3 py-1.5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center space-x-1 flex-shrink-0 shadow-xs"
                      >
                        <span>Set Location</span>
                        <MaterialIcon icon="arrow_forward" size={14} />
                      </button>
                    </div>
                  )}

                  <span className="block text-[9px] opacity-50 mt-1.5 text-right font-mono">{msg.timestamp}</span>
                </div>

              {/* Render Embedded Interactive Visual Showcase in Chat */}
              {msg.visualShowcaseProduct && (
                <div className="w-full max-w-xl">
                  <InteractiveVisualShowcase
                    product={msg.visualShowcaseProduct}
                    croppedThumbnail={msg.visualShowcaseProduct.image}
                    onRequestHITLCheckout={onRequestHITLCheckout}
                    onAddToCart={onAddToCart}
                  />
                </div>
              )}

              {/* Grounded with Google Search Live Citation Badge */}
              {msg.sender === "ai" && ((msg.groundingSources && msg.groundingSources.length > 0) || (msg.searchQueries && msg.searchQueries.length > 0)) && (
                <div className="mt-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-[#386633] font-bold text-[11px] tracking-wide uppercase">
                    <MaterialIcon icon="travel_explore" size={14} />
                    <span>Grounded with Google Live Search</span>
                  </div>

                  {msg.searchQueries && msg.searchQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] text-[#5e635f] font-medium">Queries:</span>
                      {msg.searchQueries.map((q, qIdx) => (
                        <span key={qIdx} className="bg-white border border-[#e2e2e2] text-[#18211e] px-2 py-0.5 rounded-md text-[10px] font-mono">
                          "{q}"
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.groundingSources.slice(0, 5).map((src, srcIdx) => (
                        <a
                          key={srcIdx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 bg-white hover:bg-[#e8f3e8] border border-[#d8ebd7] hover:border-[#386633] px-2.5 py-1 rounded-lg text-[11px] text-[#386633] font-medium transition group"
                          title={src.title}
                        >
                          <MaterialIcon icon="link" size={12} className="text-[#386633]" />
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <MaterialIcon icon="open_in_new" size={11} className="text-[#5e635f]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message Action Bar for AI replies */}
              {msg.sender === "ai" && (
                <div className="flex gap-3 px-1 text-[#747878] text-xs">
                  <button
                    onClick={() => navigator.clipboard.writeText(msg.text)}
                    className="hover:text-[#18211e] transition cursor-pointer p-1 rounded hover:bg-[#eeeeee]"
                    title="Copy response"
                  >
                    <MaterialIcon icon="content_copy" size={15} />
                  </button>
                  <button
                    onClick={() => handleSendMessage("Refresh recommendations")}
                    className="hover:text-[#18211e] transition cursor-pointer p-1 rounded hover:bg-[#eeeeee]"
                    title="Refresh"
                  >
                    <MaterialIcon icon="refresh" size={15} />
                  </button>
                </div>
              )}

              {/* Render Embedded Product Recommendations in Chat */}
              {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                (() => {
                  const isGroceryList = msg.recommendedProducts.some(p =>
                    p.category.toLowerCase().includes("grocery") ||
                    p.category.toLowerCase().includes("produce") ||
                    p.category.toLowerCase().includes("food") ||
                    p.id.startsWith("wp-")
                  );

                  if (isGroceryList) {
                    return (
                      <div className="space-y-3 mt-3 pt-2 border-t border-[#e2e2e2]/60">
                        {/* World Peas Grocery List Banner */}
                        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#386633] text-white flex items-center justify-center font-serif text-xs font-bold shadow-xs">
                              WP
                            </div>
                            <div>
                              <h4 className="text-xs font-serif font-bold text-[#386633] tracking-tight">World Peas Grocery List</h4>
                              <p className="text-[10px] text-neutral-600">Fresh produce & aisle items matched for your query</p>
                            </div>
                          </div>

                          {onSelectTab && (
                            <button
                              onClick={() => onSelectTab("grocery")}
                              className="px-3 py-1 bg-[#386633] hover:bg-[#2c5227] text-white text-[10px] font-medium rounded-full transition flex items-center space-x-1 cursor-pointer shadow-xs"
                            >
                              <span>View Grocery Tab</span>
                              <MaterialIcon icon="arrow_forward" size={12} />
                            </button>
                          )}
                        </div>

                        {/* World Peas List Cards */}
                        <div className="space-y-2.5">
                          {msg.recommendedProducts.map(product => {
                            const isFav = !!likedProductIds[product.id];
                            const isAdded = addedToCartId === product.id;

                            return (
                              <div
                                key={product.id}
                                className="bg-white border border-neutral-100 rounded-2xl p-3 flex items-center justify-between space-x-3 shadow-xs hover:border-neutral-200 transition"
                              >
                                {/* Left Food Image */}
                                <div className="w-14 h-14 rounded-xl bg-neutral-50 flex items-center justify-center p-1 flex-shrink-0 overflow-hidden border border-neutral-100">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                </div>

                                {/* Center Details */}
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <h3 className="text-xs font-semibold text-neutral-900 truncate leading-snug">
                                    {product.name}
                                  </h3>
                                  <p className="text-xs font-semibold text-[#386633] leading-tight">
                                    ${product.price.toFixed(2)} {product.price < 5 ? "each" : ""}
                                  </p>
                                  <div className="text-[10px] text-neutral-500 font-normal flex items-center space-x-0.5">
                                    <span>{product.brand || "Kunisaki Farms"}</span>
                                    <span className="text-neutral-400">→</span>
                                  </div>
                                </div>

                                {/* Right Action Buttons */}
                                <div className="flex flex-col items-end justify-between h-14 py-0.5 flex-shrink-0">
                                  <button
                                    onClick={() => toggleLike(product.id)}
                                    className="text-neutral-400 hover:text-red-500 transition cursor-pointer p-0.5"
                                    title="Favorite"
                                  >
                                    <MaterialIcon
                                      icon={isFav ? "favorite" : "favorite_border"}
                                      size={16}
                                      className={isFav ? "text-red-500" : "text-neutral-400"}
                                    />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onAddToCart) {
                                        onAddToCart(product);
                                        setAddedToCartId(product.id);
                                        setTimeout(() => setAddedToCartId(null), 2000);
                                      }
                                      try {
                                        const saved = localStorage.getItem("spresso_grocery_checklist");
                                        const existing = saved ? JSON.parse(saved) : [];
                                        const newItem = {
                                          id: `list-${product.id}-${Date.now()}`,
                                          name: product.name,
                                          quantity: "1",
                                          checked: false,
                                          priceStr: `$${product.price.toFixed(2)}`,
                                          onSale: true
                                        };
                                        if (!existing.some((i: any) => i.name.toLowerCase() === product.name.toLowerCase())) {
                                          const updated = [newItem, ...existing];
                                          localStorage.setItem("spresso_grocery_checklist", JSON.stringify(updated));
                                          window.dispatchEvent(new Event("spresso_grocery_updated"));
                                        }
                                      } catch (e) {}
                                    }}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition shadow-xs cursor-pointer ${
                                      isAdded
                                        ? "bg-emerald-700 text-white scale-105"
                                        : "bg-[#386633] hover:bg-[#2c5227] text-white"
                                    }`}
                                    title="Add to basket & grocery list"
                                  >
                                    <MaterialIcon icon={isAdded ? "check" : "add"} size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 mt-3 pt-2 border-t border-[#e2e2e2]/60">
                      {/* View mode toggle bar */}
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center space-x-1.5 text-[11px] font-mono font-bold text-[#18211e]">
                          <MaterialIcon icon="shopping_bag" size={14} className="text-[#386633]" />
                          <span>RECOMMENDED ITEMS ({msg.recommendedProducts.length})</span>
                        </div>

                        <div className="flex items-center space-x-1 bg-[#f3f3f4] p-1 rounded-lg border border-[#e2e2e2]">
                          <button
                            onClick={() => setProductViewModes(prev => ({ ...prev, [msg.id]: "horizontal" }))}
                            className={`p-1.5 rounded-md text-[10px] transition flex items-center justify-center cursor-pointer ${
                              (productViewModes[msg.id] || "horizontal") === "horizontal"
                                ? "bg-white text-[#18211e] shadow-xs"
                                : "text-[#747878] hover:text-[#18211e]"
                            }`}
                            title="Horizontal Carousel View"
                            aria-label="Horizontal Carousel View"
                          >
                            <MaterialIcon icon="swipe_left" size={15} />
                          </button>

                          <button
                            onClick={() => setProductViewModes(prev => ({ ...prev, [msg.id]: "vertical" }))}
                            className={`p-1.5 rounded-md text-[10px] transition flex items-center justify-center cursor-pointer ${
                              productViewModes[msg.id] === "vertical"
                                ? "bg-white text-[#18211e] shadow-xs"
                                : "text-[#747878] hover:text-[#18211e]"
                            }`}
                            title="Vertical List View"
                            aria-label="Vertical List View"
                          >
                            <MaterialIcon icon="swap_vert" size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Horizontal Scroll Carousel View */}
                      {(productViewModes[msg.id] || "horizontal") === "horizontal" ? (
                        <div className="relative group">
                          <div
                            id={`carousel-${msg.id}`}
                            className="flex space-x-3 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory chat-scrollbar scroll-smooth"
                          >
                            {msg.recommendedProducts.map(product => (
                              <div
                                key={product.id}
                                className="w-[250px] sm:w-[270px] flex-shrink-0 snap-start bg-white p-3 rounded-2xl border border-[#e2e2e2] hover:border-[#18211e] transition shadow-sm space-y-2.5 flex flex-col justify-between group/card relative"
                              >
                                <div className="space-y-2">
                                  {/* Image Container */}
                                  <div className="relative aspect-video rounded-xl overflow-hidden bg-[#f3f3f4]">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300"
                                      style={
                                        active360ProductId === product.id
                                          ? { transform: `rotateY(${rotationAngles[product.id] || 0}deg)` }
                                          : undefined
                                      }
                                    />
                                    
                                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-md text-[10px] font-bold text-[#18211e] border border-[#e2e2e2] font-mono shadow-sm">
                                      ${product.price}
                                    </span>

                                    {/* Floating Controls on Right Side */}
                                    <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-white/90 backdrop-blur-md p-1 rounded-lg border border-[#e2e2e2] shadow-sm">
                                      <button
                                        onClick={() =>
                                          setActive360ProductId(prev => (prev === product.id ? null : product.id))
                                        }
                                        className={`p-1 rounded hover:bg-[#f3f3f4] transition cursor-pointer ${
                                          active360ProductId === product.id ? "text-[#386633] bg-[#e8f3e8]" : "text-[#747878]"
                                        }`}
                                        title="360° Product View"
                                      >
                                        <MaterialIcon icon="360" size={14} />
                                      </button>

                                      <button
                                        onClick={() => toggleLike(product.id)}
                                        className={`p-1 rounded hover:bg-[#f3f3f4] transition cursor-pointer ${likedProductIds[product.id] ? "text-red-500" : "text-[#747878]"}`}
                                        title="Like"
                                      >
                                        <MaterialIcon icon={likedProductIds[product.id] ? "favorite" : "favorite_border"} size={14} />
                                      </button>

                                      <button
                                        onClick={() => toggleBookmark(product.id)}
                                        className={`p-1 rounded hover:bg-[#f3f3f4] transition cursor-pointer ${bookmarkedProductIds[product.id] ? "text-[#386633]" : "text-[#747878]"}`}
                                        title="Bookmark"
                                      >
                                        <MaterialIcon icon={bookmarkedProductIds[product.id] ? "bookmark" : "bookmark_border"} size={14} />
                                      </button>

                                      <button
                                        onClick={() => handleShareProduct(product)}
                                        className="p-1 text-[#747878] hover:text-[#18211e] hover:bg-[#f3f3f4] rounded transition cursor-pointer"
                                        title="Share Product"
                                      >
                                        <MaterialIcon icon={copiedShareId === product.id ? "check" : "share"} size={14} className={copiedShareId === product.id ? "text-emerald-600" : ""} />
                                      </button>
                                    </div>

                                    {/* 360 Rotation Control Overlay when Active */}
                                    {active360ProductId === product.id && (
                                      <div className="absolute inset-x-1 bottom-1 bg-white/95 backdrop-blur-md border border-[#d8ebd7] rounded-lg p-1.5 space-y-0.5 shadow-md z-10 animate-fadeIn">
                                        <div className="flex justify-between items-center text-[9px] font-mono text-[#386633] font-bold">
                                          <span className="flex items-center space-x-0.5">
                                            <MaterialIcon icon="360" size={12} />
                                            <span>360° Rotate</span>
                                          </span>
                                          <span>{rotationAngles[product.id] || 0}°</span>
                                        </div>
                                        <input
                                          type="range"
                                          min="-180"
                                          max="180"
                                          value={rotationAngles[product.id] || 0}
                                          onChange={e => {
                                            const val = Number(e.target.value);
                                            setRotationAngles(prev => ({ ...prev, [product.id]: val }));
                                          }}
                                          className="w-full accent-[#386633] cursor-pointer h-1"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Info */}
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold font-mono text-[#386633] uppercase">{product.brand}</span>
                                      <div className="flex items-center space-x-0.5 text-amber-500 font-bold text-[10px]">
                                        <MaterialIcon icon="star" size={12} />
                                        <span>{product.rating ? product.rating.toFixed(1) : "4.9"}</span>
                                      </div>
                                    </div>
                                    <h5 className="text-xs font-bold text-[#18211e] line-clamp-1 mt-0.5">{product.name}</h5>
                                    <p className="text-[10px] text-[#5e5e63] mt-0.5 line-clamp-2 leading-relaxed">{product.description}</p>
                                  </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-[#f3f3f4]">
                                  <div className="flex items-center space-x-1.5">
                                    <button
                                      onClick={() => onSelectTryOn(product)}
                                      className="p-2 bg-[#f3f3f4] hover:bg-[#e8f3e8] text-[#18211e] font-bold text-[10px] rounded-lg border border-[#c4c7c7] transition flex items-center justify-center cursor-pointer"
                                      title="Virtual Try On"
                                      aria-label="Virtual Try On"
                                    >
                                      <MaterialIcon icon="styler" size={15} className="text-[#386633]" />
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (onAddToCart) {
                                          onAddToCart(product);
                                          setAddedToCartId(product.id);
                                          setTimeout(() => setAddedToCartId(null), 2000);
                                        }
                                      }}
                                      className={`p-2 font-bold text-[10px] rounded-lg border transition flex items-center justify-center cursor-pointer ${
                                        addedToCartId === product.id
                                          ? "bg-emerald-600 text-white border-emerald-600"
                                          : "bg-white hover:bg-[#f3f3f4] text-[#18211e] border-[#c4c7c7]"
                                      }`}
                                      title="Add to Cart"
                                      aria-label="Add to Cart"
                                    >
                                      <MaterialIcon icon={addedToCartId === product.id ? "check" : "add_shopping_cart"} size={15} />
                                    </button>

                                    <button
                                      onClick={() => triggerCheckout(product)}
                                      className="flex-1 p-2 bg-[#18211e] hover:bg-[#323d38] text-white font-bold text-[10px] rounded-lg transition shadow flex items-center justify-center cursor-pointer"
                                      title={`Buy Now ($${product.price})`}
                                      aria-label={`Buy Now ($${product.price})`}
                                    >
                                      <MaterialIcon icon="shopping_bag" size={15} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Horizontal Carousel Left/Right Scroll Arrow Overlay Buttons */}
                          {msg.recommendedProducts.length > 1 && (
                            <>
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`carousel-${msg.id}`);
                                  if (el) el.scrollBy({ left: -260, behavior: "smooth" });
                                }}
                                className="absolute -left-3 top-1/2 -translate-y-1/2 p-2.5 bg-white text-[#386633] hover:bg-[#386633] hover:text-white rounded-full shadow-md border border-[#d8ebd7] transition cursor-pointer z-10 flex items-center justify-center"
                                title="Swipe Left"
                                aria-label="Swipe Left"
                              >
                                <MaterialIcon icon="swipe_left" size={18} />
                              </button>
                              <button
                                onClick={() => {
                                  const el = document.getElementById(`carousel-${msg.id}`);
                                  if (el) el.scrollBy({ left: 260, behavior: "smooth" });
                                }}
                                className="absolute -right-3 top-1/2 -translate-y-1/2 p-2.5 bg-white text-[#386633] hover:bg-[#386633] hover:text-white rounded-full shadow-md border border-[#d8ebd7] transition cursor-pointer z-10 flex items-center justify-center"
                                title="Swipe Right"
                                aria-label="Swipe Right"
                              >
                                <MaterialIcon icon="swipe_right" size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        /* Vertical List View */
                        <div className="flex flex-col space-y-3 pt-1 max-h-[520px] overflow-y-auto pr-1 chat-scrollbar">
                          {msg.recommendedProducts.map(product => (
                            <div
                              key={product.id}
                              className="bg-white p-3.5 rounded-2xl border border-[#e2e2e2] hover:border-[#386633] transition shadow-sm flex flex-col sm:flex-row gap-3 items-stretch group/card"
                            >
                              {/* Image */}
                              <div className="relative w-full sm:w-36 h-32 sm:h-auto rounded-xl overflow-hidden bg-[#f3f3f4] flex-shrink-0">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover/card:scale-105 transition duration-300" />
                                <span className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-md text-[10px] font-bold text-[#18211e] border border-[#e2e2e2] font-mono shadow-sm">
                                  ${product.price}
                                </span>
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 flex flex-col justify-between space-y-2">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold font-mono text-[#386633] uppercase">{product.brand}</span>
                                    <div className="flex items-center space-x-1">
                                      <div className="flex items-center space-x-0.5 text-amber-500 font-bold text-[10px] mr-2">
                                        <MaterialIcon icon="star" size={12} />
                                        <span>{product.rating ? product.rating.toFixed(1) : "4.9"}</span>
                                      </div>
                                      <button
                                        onClick={() => toggleLike(product.id)}
                                        className={`p-1 rounded hover:bg-[#f3f3f4] transition cursor-pointer ${likedProductIds[product.id] ? "text-red-500" : "text-[#747878]"}`}
                                      >
                                        <MaterialIcon icon={likedProductIds[product.id] ? "favorite" : "favorite_border"} size={14} />
                                      </button>
                                      <button
                                        onClick={() => toggleBookmark(product.id)}
                                        className={`p-1 rounded hover:bg-[#f3f3f4] transition cursor-pointer ${bookmarkedProductIds[product.id] ? "text-[#386633]" : "text-[#747878]"}`}
                                      >
                                        <MaterialIcon icon={bookmarkedProductIds[product.id] ? "bookmark" : "bookmark_border"} size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleShareProduct(product)}
                                        className="p-1 text-[#747878] hover:text-[#18211e] hover:bg-[#f3f3f4] rounded transition cursor-pointer"
                                      >
                                        <MaterialIcon icon={copiedShareId === product.id ? "check" : "share"} size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  <h5 className="text-xs font-bold text-[#18211e] mt-0.5">{product.name}</h5>
                                  <p className="text-[11px] text-[#5e5e63] mt-1 leading-relaxed">{product.description}</p>
                                </div>

                                <div className="flex items-center space-x-2 pt-2 border-t border-[#f3f3f4]">
                                  <button
                                    onClick={() => onSelectTryOn(product)}
                                    className="p-2 bg-[#f3f3f4] hover:bg-[#e8f3e8] text-[#18211e] font-bold text-[10px] rounded-lg border border-[#c4c7c7] transition flex items-center justify-center cursor-pointer"
                                    title="Virtual Try On"
                                    aria-label="Virtual Try On"
                                  >
                                    <MaterialIcon icon="styler" size={15} className="text-[#386633]" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (onAddToCart) {
                                        onAddToCart(product);
                                        setAddedToCartId(product.id);
                                        setTimeout(() => setAddedToCartId(null), 2000);
                                      }
                                    }}
                                    className={`px-3 py-1.5 font-bold text-[10px] rounded-lg border transition flex items-center justify-center cursor-pointer ${
                                      addedToCartId === product.id
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-white hover:bg-[#f3f3f4] text-[#18211e] border-[#c4c7c7]"
                                    }`}
                                  >
                                    <MaterialIcon icon={addedToCartId === product.id ? "check" : "add_shopping_cart"} size={13} className="mr-1" />
                                    <span>{addedToCartId === product.id ? "Added!" : "Add Cart"}</span>
                                  </button>

                                  <button
                                    onClick={() => triggerCheckout(product)}
                                    className="px-4 py-1.5 bg-[#18211e] hover:bg-[#323d38] text-white font-bold text-[10px] rounded-lg transition shadow flex items-center justify-center space-x-1 cursor-pointer ml-auto"
                                  >
                                    <MaterialIcon icon="shopping_bag" size={13} />
                                    <span>Buy (${product.price})</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )))}


      </div>

      {/* Reusable AIShopperInputBar Component */}
      <AIShopperInputBar
        onSend={(text, image) => handleSendMessage(text, image)}
        isTyping={isTyping}
        isVoiceActive={isVoiceActive}
        isSpeaking={isSpeaking}
        isListening={isListening}
        onToggleVoice={toggleVoiceMode}
        onStopVoice={stopVoiceMode}
        onSelectTryOn={onSelectTryOn}
        onAddToCart={onAddToCart}
      />
    </div>
  );
};
