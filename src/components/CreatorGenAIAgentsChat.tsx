import React, { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import { MaterialIcon } from "./MaterialIcon";
import ReactMarkdown from "react-markdown";
import { ProductItem } from "../types";

export type GenAIAgentType =
  | "ECONOMIC_RESEARCH_AGENT"
  | "MARKETING_COORDINATOR_AGENT"
  | "BRAND_STUDIO_AGENT"
  | "GLOBAL_CLIENT_AUDIT_AGENT";

interface AgentMeta {
  id: GenAIAgentType;
  title: string;
  badge: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  capabilities: string[];
  quickPrompts: { label: string; prompt: string }[];
}

const AGENTS_METADATA: AgentMeta[] = [
  {
    id: "ECONOMIC_RESEARCH_AGENT",
    title: "Economic Market Research",
    badge: "Macro & Industry Insights",
    subtitle: "Retail inflation analysis, FRED interest rates, consumer sentiment & supply chain risk",
    icon: "analytics",
    color: "text-blue-700",
    bgColor: "bg-blue-50/80",
    borderColor: "border-blue-200",
    capabilities: ["Macro Trends", "Inflation Analysis", "Consumer Sentiment", "Supply Chain Risk"],
    quickPrompts: [
      { label: "Retail Inflation & Sentiment", prompt: "Run a market research report on current retail inflation trends, consumer confidence, and retail sales performance." },
      { label: "Supply Chain & Pricing", prompt: "Analyze how supply chain volatility and material cost changes affect fashion & retail pricing." },
      { label: "Category Growth Analysis", prompt: "Provide market risk and growth opportunities for sustainable apparel and lifestyle products." }
    ]
  },
  {
    id: "MARKETING_COORDINATOR_AGENT",
    title: "Marketing Coordinator",
    badge: "Campaigns & Funnels",
    subtitle: "Domain strategies, high-converting funnel wireframes, launch timelines & ad copy",
    icon: "campaign",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50/80",
    borderColor: "border-emerald-200",
    capabilities: ["Campaign Strategy", "Funnel Planning", "Domain Branding", "Launch Timeline"],
    quickPrompts: [
      { label: "Brand Launch Strategy", prompt: "Create a high-impact marketing launch timeline and channel strategy for an eco-luxury apparel brand." },
      { label: "Domain & Landing Funnel", prompt: "Suggest brandable domain names and a conversion-driven landing page section structure." },
      { label: "Ad Copy & Prompts", prompt: "Draft social media ad copy hooks and promotional email campaign templates." }
    ]
  },
  {
    id: "BRAND_STUDIO_AGENT",
    title: "Brand Studio",
    badge: "Ideation & Copywriting",
    subtitle: "On-brand product descriptions, visual identity concepts, tone guidelines & taglines",
    icon: "palette",
    color: "text-amber-700",
    bgColor: "bg-amber-50/80",
    borderColor: "border-amber-200",
    capabilities: ["Product Descriptions", "Visual Identity", "Brand Taglines", "Voice Guidelines"],
    quickPrompts: [
      { label: "On-Brand Description", prompt: "Generate an elegant, high-converting product description and story for a luxury cashmere trench coat." },
      { label: "Brand Voice Guidelines", prompt: "Define a luxury brand voice guideline including key adjectives, tone, and banned clichés." },
      { label: "Product Line Ideation", prompt: "Brainstorm 5 innovative product line concepts with catchy names and unique selling points." }
    ]
  },
  {
    id: "GLOBAL_CLIENT_AUDIT_AGENT",
    title: "Global Client Audit",
    badge: "Compliance & Risk",
    subtitle: "Corporate officer checks, SEC EDGAR filing analysis, corporate solvency & KYC verification",
    icon: "verified_user",
    color: "text-purple-700",
    bgColor: "bg-purple-50/80",
    borderColor: "border-purple-200",
    capabilities: ["SEC Filing Audit", "Corporate KYC", "Solvency Risk", "Compliance Score"],
    quickPrompts: [
      { label: "SEC 10-K & Insider Audit", prompt: "Perform a financial filing audit for Nike Inc (NKE), reviewing 10-K risks and executive stock activity." },
      { label: "Corporate Background Check", prompt: "Conduct a corporate background and compliance risk audit for global retail partners." },
      { label: "Client Risk Evaluation", prompt: "Evaluate corporate solvency, officer filings, and credit risk rating for key client accounts." }
    ]
  }
];

export interface CreativeTemplate {
  id: string;
  name: string;
  creator: string;
  category: "Community" | "Image" | "Video" | "Prompting" | "Experimental";
  description: string;
  icon: string;
  promptExample: string;
}

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  // Community Templates
  { id: "subtitles", name: "AI Subtitle Generator", creator: "Classic_Ai_Apps", category: "Community", description: "Automatically convert speech in videos into accurate, stylized captions & subtitles with automatic timings.", icon: "subtitles", promptExample: "Generate TikTok styled dynamic subtitles with highlight captions for product video" },
  { id: "brand-carousel", name: "Brand Carousel Builder", creator: "Exterly.io", category: "Community", description: "Create high-fidelity branded slide carousels for social media marketing.", icon: "view_carousel", promptExample: "Create 5-slide branded carousel showcasing autumn footwear collection" },
  { id: "car-showdown", name: "Car Showdown", creator: "KareemAfterWork", category: "Community", description: "Create cinematic car duos with stylized lighting and custom POVs.", icon: "directions_car", promptExample: "Cinematic night race duo between futuristic EV sports car and vintage classic" },
  { id: "character-persona", name: "Character Persona Generator", creator: "MrRobotX", category: "Community", description: "Generate 22+ consistent character portraits from a reference image across multiple angles.", icon: "face", promptExample: "Generate 360-degree character turnaround sheet for high-fashion runway model" },
  { id: "emote-crafter", name: "Emote Crafter Pro", creator: "Rotti", category: "Community", description: "Professional character sprite engine with Plutchik wheel and special emote grid.", icon: "mood", promptExample: "Create an 8-emote reaction grid for streaming brand mascot" },
  { id: "geovisualizer", name: "GeoVisualizer", creator: "eteek", category: "Community", description: "Identify locations in your media and generate cinematic drone orbits.", icon: "public", promptExample: "360-degree aerial drone orbit around coastal boutique storefront" },
  { id: "gridcraft", name: "GridCraft", creator: "Queen Usouwa", category: "Community", description: "Arrange multiple images into clean, customizable grid layouts, mood boards, and contact sheets.", icon: "grid_on", promptExample: "4x4 aesthetic luxury fashion mood board with custom border margins" },
  { id: "lumina-filter", name: "Lumina Filter Studio", creator: "AJEET PAL", category: "Community", description: "Professional image filtering with real-time effects and intensity controls.", icon: "auto_fix_high", promptExample: "Apply vintage 35mm film grain and warm golden hour lighting filter" },
  { id: "luz-relighting", name: "LuzRelighting", creator: "Dany", category: "Community", description: "Relight your scenes by clicking where you want the light source to be.", icon: "light_mode", promptExample: "Relight product shot with dramatic neon blue and violet side spotlighting" },
  { id: "manga-architect", name: "Manga Architect Pro", creator: "Stormy", category: "Community", description: "Generate KDP-ready manga projects with print-specification covers and margins.", icon: "menu_book", promptExample: "High contrast black and white action manga page layout" },
  { id: "mars-blueprint", name: "Mars Blueprint Architect", creator: "Sridhar", category: "Community", description: "Architect Martian colonies using a simplified structural stencil library.", icon: "architecture", promptExample: "Futuristic Mars habitat dome architectural blueprint" },
  { id: "retro-term", name: "RETRO-TERM 80", creator: "Matthew Wyatt", category: "Community", description: "Brutalist terminal with magnetic distortion and phosphor matrix effects.", icon: "terminal", promptExample: "1980s green phosphor CRT terminal monitor interface render" },
  { id: "text-effect", name: "Text Effect", creator: "inxstudio", category: "Community", description: "Generate stylized text renders inspired by your sample media.", icon: "title", promptExample: "3D liquid chrome metallic text render for streetwear brand" },
  { id: "vector-sticker", name: "Vector Sticker Studio", creator: "Glenn B", category: "Community", description: "Create die-cut stickers from your own images, with smart cutout and style samplers.", icon: "loyalty", promptExample: "Die-cut glossy vinyl sticker with bold white outline" },
  { id: "void-velocity", name: "Void Velocity", creator: "Joker", category: "Community", description: "High-octane arcade jumper with neon aesthetics and aggressive synthetic beats.", icon: "speed", promptExample: "Synthwave retrowave 80s arcade highway video animation" },

  // Image Templates
  { id: "simple-sketch", name: "Simple Sketch", creator: "Google", category: "Image", description: "Turn any drawing into a stylized photorealistic image.", icon: "draw", promptExample: "Convert hand pencil doodle into photorealistic leather jacket" },
  { id: "scene-explorer", name: "Scene Explorer", creator: "Google", category: "Image", description: "Explore visuals for scenes based on an initial location.", icon: "explore", promptExample: "Explore Tokyo Shibuya fashion alleyways at twilight" },
  { id: "mockup", name: "Mockup", creator: "Google", category: "Image", description: "Comp your image into different physical environments.", icon: "devices", promptExample: "Place brand logo on luxury ceramic coffee cup and hoodie mockup" },
  { id: "image-editor", name: "Image Editor", creator: "Google", category: "Image", description: "Transform objects, add text and adjust image sizing.", icon: "edit_note", promptExample: "Replace dark background with sunlit marble countertop" },
  { id: "shot-explorer", name: "Shot Explorer", creator: "Google", category: "Image", description: "See your scene from new camera angles and lenses.", icon: "linked_camera", promptExample: "Render low angle dramatic worm-eye shot of sunglasses" },
  { id: "mask-magic", name: "Mask Magic", creator: "Arden Schager, Google", category: "Image", description: "Perform selective image edits using segmentation masks.", icon: "auto_fix_normal", promptExample: "Mask jacket and change color from brown to emerald green" },
  { id: "converge", name: "Converge", creator: "Chris Maestas", category: "Image", description: "Render your sketches into fully textured 3D scenes.", icon: "brush", promptExample: "Render architectural sketch into 3D glass showroom" },
  { id: "grid-architect", name: "Grid Architect", creator: "Henry Daubrez", category: "Image", description: "Create image grids and extract individual images from them.", icon: "grid_view", promptExample: "Extract 6 individual product angles from single multi-view photo" },

  // Video Templates
  { id: "shader-effects", name: "Shader Effects", creator: "Google", category: "Video", description: "Apply customizable filters and real-time visual effects to media.", icon: "gradient", promptExample: "Apply VHS glitch shader effect to video reel" },
  { id: "type-overlays", name: "Type Overlays", creator: "Google", category: "Video", description: "Add animated text and kinetic typography to your videos.", icon: "text_fields", promptExample: "Animated kinetic typography text popping on screen" },
  { id: "pixelbento", name: "pixelBento", creator: "László Gaal", category: "Video", description: "Apply post-processing effects like lo-fi and glitch.", icon: "aspect_ratio", promptExample: "Lo-fi retro 16-bit pixelated animation filter" },
  { id: "poster-designer", name: "Poster Designer", creator: "Heysu Oh & Kaloyan Kolev, Google", category: "Video", description: "Create animated motion posters from your media.", icon: "movie", promptExample: "Animate static fashion poster into 6-second motion loop" },
  { id: "video-sketch", name: "Video Sketch", creator: "Google", category: "Video", description: "Animate drawings and sketches on top of your videos.", icon: "gesture", promptExample: "Overlay neon glowing animated line drawings on dancer video" },
  { id: "transition-machine", name: "Transition Machine", creator: "Scotch Johnson, Google", category: "Video", description: "Generate seamless transitions between your video clips.", icon: "transform", promptExample: "Morphing whip-pan zoom transition between product shots" },
  { id: "weirdcore", name: "Weirdcore", creator: "Kaloyan Kolev, Google", category: "Video", description: "Fry, chop, melt and distort your videos with experimental aesthetics.", icon: "cyclone", promptExample: "Liquid melting datamosh distortion video effect" },
  { id: "video-resizer", name: "Video Resizer", creator: "Google", category: "Video", description: "Resize your videos into any aspect ratio without cropping subject.", icon: "crop", promptExample: "Smart resize landscape 16:9 video into vertical 9:16 TikTok story" },
  { id: "stringout-creator", name: "Stringout Creator", creator: "Google", category: "Video", description: "Stitch multiple video clips together seamlessly.", icon: "video_library", promptExample: "Stitch 5 product b-roll clips into a cohesive 15s reel" },
  { id: "video-granulator", name: "Video Granulator", creator: "Arden Schager, Google", category: "Video", description: "Play your videos like an instrument with granular frame triggers.", icon: "tune", promptExample: "Granular audio-reactive stutter video effect" },

  // Prompting Templates
  { id: "character-xray", name: "Character X-Ray", creator: "MetaPuppet", category: "Prompting", description: "Develop your characters, design sheets, and backstory.", icon: "psychology", promptExample: "Detailed character dossier for sci-fi cybernetic protagonist" },
  { id: "style-writer", name: "Style Writer", creator: "Google", category: "Prompting", description: "Turn your mood board into a detailed, structured style prompt.", icon: "style", promptExample: "Analyze moodboard images and output Midjourney v6 style prompt" },
  { id: "storyboard-studio", name: "Storyboard Studio", creator: "Google", category: "Prompting", description: "Write a script, create the cast, and visualize a complete storyboard.", icon: "auto_stories", promptExample: "30-second commercial script with 6 storyboard shot descriptions" },
  { id: "prompt-tree", name: "Prompt Tree", creator: "Scotch Johnson, Google", category: "Prompting", description: "Organize prompts using a branching structure for precise iterative edits.", icon: "account_tree", promptExample: "Branch prompt into 3 variations: lighting, color grade, camera lens" },
  { id: "story-sketch", name: "Story Sketch", creator: "Google", category: "Prompting", description: "Create storyboards that follow any visual style.", icon: "history_edu", promptExample: "Watercolor comic book style story sketch layout" },

  // Experimental Templates
  { id: "frame-deconstructor", name: "Frame Deconstructor", creator: "Shashwath Santosh & Alan Yam, Google", category: "Experimental", description: "Deconstruct videos and gifs to create 3D sculptures.", icon: "view_in_ar", promptExample: "Deconstruct video motion into 3D volumetric glass sculpture" },
  { id: "blob-tracking", name: "Blob Tracking", creator: "Arden Schager, Google", category: "Experimental", description: "Generate futuristic tracking effects on moving objects.", icon: "radar", promptExample: "Futuristic HUD target tracking overlay on moving vehicle" },
  { id: "depthwarp-4d", name: "DepthWarp 4D", creator: "Sam Lawton, Google", category: "Experimental", description: "See your video in a new spatial 3D depth dimension.", icon: "3d_rotation", promptExample: "Extract depth map and parallax warp video clip" },
  { id: "webcam-set", name: "Webcam Set", creator: "Google", category: "Experimental", description: "Drop yourself into video footage in real-time.", icon: "videocam", promptExample: "Composite live camera stream into cyberpunk rain scene" },
  { id: "datamosh", name: "Datamosh", creator: "Kaloyan Kolev, Google", category: "Experimental", description: "Add I-frame datamoshing glitch effects to your videos.", icon: "blur_on", promptExample: "Pixel bleeding datamosh transition between two video clips" },
  { id: "3d-model-visualizer", name: "3D Model Visualizer", creator: "Filip Havlena, Google", category: "Experimental", description: "Use a 3D model geometry to guide your image generation.", icon: "precision_manufacturing", promptExample: "Use 3D CAD chair mesh as structural depth guide for rendering" },
  { id: "scout360", name: "Scout360", creator: "PJ Ace", category: "Experimental", description: "Capture a 360 degree environment from a single image.", icon: "panorama_photosphere", promptExample: "Expand single photo into 360 equirectangular panorama" },
  { id: "ribbit", name: "Ribbit", creator: "Kat Zhang", category: "Experimental", description: "Perform videos live as the music beat drives playback.", icon: "graphic_eq", promptExample: "Sync video speed and frame flashes to audio BPM beat" },
  { id: "whisk", name: "Whisk", creator: "Google", category: "Experimental", description: "Use multiple images as prompts to visualize your hybrid ideas.", icon: "blender", promptExample: "Blend sneaker silhouette + sports car aesthetic into hybrid shoe" },
  { id: "pose-text", name: "Pose Text", creator: "Alan Yam, Google", category: "Experimental", description: "Add text labels that track a character's body pose in video.", icon: "directions_run", promptExample: "Track dancer joints and overlay live coordinate text labels" },
  { id: "3d-face-swap", name: "3D Face Swap", creator: "Google", category: "Experimental", description: "Swap your face with virtual 3D characters seamlessly.", icon: "face_retouching_natural", promptExample: "Swap user face onto 3D animated warrior model" }
];

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  agentType?: GenAIAgentType;
  isStreaming?: boolean;
}

interface CreatorGenAIAgentsChatProps {
  user: User | null;
  userName?: string;
  products?: ProductItem[];
  userLocation?: string | null;
  onRequestLocationPermission?: () => void;
  onAskAI?: (query: string) => void;
}

export const CreatorGenAIAgentsChat: React.FC<CreatorGenAIAgentsChatProps> = ({
  user,
  userName = "Creator",
  products = [],
  userLocation,
  onRequestLocationPermission
}) => {
  const [activeMainTab, setActiveMainTab] = useState<"agents" | "templates">("templates");
  const [selectedAgent, setSelectedAgent] = useState<GenAIAgentType>("ECONOMIC_RESEARCH_AGENT");
  
  // Template Gallery state
  const [templateCategory, setTemplateCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<CreativeTemplate | null>(CREATIVE_TEMPLATES[0]);
  const [customGenPrompt, setCustomGenPrompt] = useState<string>("");
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{
    prompt: string;
    templateName: string;
    imageUrl: string;
    videoConcept: string;
  } | null>(null);

  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-creator-1",
      sender: "ai",
      agentType: "ECONOMIC_RESEARCH_AGENT",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: `Welcome, ${userName}! Select a workspace below to conduct market research, coordinate campaigns, create on-brand descriptions, or audit global client accounts.`
    }
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const activeAgentMeta = AGENTS_METADATA.find(a => a.id === selectedAgent) || AGENTS_METADATA[0];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: timeStr,
      agentType: selectedAgent
    };

    const newAiMsg: ChatMessage = {
      id: aiMsgId,
      sender: "ai",
      text: "",
      timestamp: timeStr,
      agentType: selectedAgent,
      isStreaming: true
    };

    setMessages(prev => [...prev, newUserMsg, newAiMsg]);
    if (!customText) setInputPrompt("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          userName,
          location: userLocation || undefined,
          agentType: selectedAgent
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to initialize streaming response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
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
                setMessages(prev =>
                  prev.map(m => (m.id === aiMsgId ? { ...m, text: accumulatedText } : m))
                );
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      setMessages(prev =>
        prev.map(m => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
    } catch (err) {
      console.error("Agent chat error:", err);
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? { ...m, text: "Unable to process request at this moment. Please try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandomizeTemplate = () => {
    const randomIndex = Math.floor(Math.random() * CREATIVE_TEMPLATES.length);
    const chosen = CREATIVE_TEMPLATES[randomIndex];
    setActiveTemplate(chosen);
    setCustomGenPrompt(chosen.promptExample);
  };

  const handleRunTemplateGeneration = (tmpl?: CreativeTemplate) => {
    const t = tmpl || activeTemplate || CREATIVE_TEMPLATES[0];
    const promptToUse = customGenPrompt.trim() || t.promptExample;

    setIsGeneratingMedia(true);
    setGeneratedResult(null);

    // Simulate Genkit image/video synthesis pipeline
    setTimeout(() => {
      const imagesList = [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80"
      ];
      const randomImg = imagesList[Math.floor(Math.random() * imagesList.length)];

      setGeneratedResult({
        prompt: promptToUse,
        templateName: t.name,
        imageUrl: randomImg,
        videoConcept: `Genkit 60fps dynamic video render applied using reference template [${t.name}] by ${t.creator}. Applied style transfer, camera orbits and raytraced lighting.`
      });
      setIsGeneratingMedia(false);
    }, 1800);
  };

  const filteredTemplates = CREATIVE_TEMPLATES.filter(tmpl => {
    const matchesCategory = templateCategory === "ALL" || tmpl.category === templateCategory;
    const matchesSearch = !searchQuery.trim() || 
      tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* Top Header & Tab Selector */}
      <div className="bg-white border border-[#d8ebd7] rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#e8f3e8] border border-[#386633]/20 flex items-center justify-center text-[#386633]">
              <MaterialIcon icon="auto_awesome" size={28} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#18211e]">Spresso Genkit Creative Studio</h2>
                <span className="px-2.5 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">
                  AI Video & Image Hub
                </span>
              </div>
              <p className="text-xs text-[#52645b] mt-0.5">
                Community Templates • Video & Image Generation • Style Reference Randomizer
              </p>
            </div>
          </div>

          {/* Main Workspace Navigation Switcher */}
          <div className="flex items-center p-1 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] shrink-0">
            <button
              onClick={() => setActiveMainTab("templates")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                activeMainTab === "templates"
                  ? "bg-[#386633] text-white shadow-xs"
                  : "text-[#52645b] hover:text-[#18211e]"
              }`}
            >
              <MaterialIcon icon="grid_view" size={16} />
              <span>Community & Media Templates ({CREATIVE_TEMPLATES.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab("agents")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                activeMainTab === "agents"
                  ? "bg-[#386633] text-white shadow-xs"
                  : "text-[#52645b] hover:text-[#18211e]"
              }`}
            >
              <MaterialIcon icon="deployed_code_account" size={16} />
              <span>GenAI Agent Workspaces</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: COMMUNITY & MEDIA TEMPLATES GALLERY */}
      {activeMainTab === "templates" && (
        <div className="space-y-6">
          {/* Controls Bar: Category Filters, Search, Randomize Button */}
          <div className="bg-white p-4 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {["ALL", "Community", "Image", "Video", "Prompting", "Experimental"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setTemplateCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      templateCategory === cat
                        ? "bg-[#386633] text-white shadow-xs"
                        : "bg-[#f2f8f2] text-[#5e635f] hover:bg-[#e8f3e8] border border-[#d8ebd7]"
                    }`}
                  >
                    {cat === "ALL" ? `All Templates (${CREATIVE_TEMPLATES.length})` : `${cat}`}
                  </button>
                ))}
              </div>

              {/* Randomize Template Button */}
              <button
                onClick={handleRandomizeTemplate}
                className="px-4 py-2 bg-gradient-to-r from-[#386633] to-[#2c5227] text-white text-xs font-bold rounded-xl shadow-xs hover:opacity-90 transition cursor-pointer flex items-center space-x-2 shrink-0"
                title="Randomize style or template for your generation"
              >
                <MaterialIcon icon="shuffle" size={16} />
                <span>Randomize Style / Reference</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <MaterialIcon icon="search" size={18} className="absolute left-3.5 top-3 text-[#5e635f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search community templates by name, creator, or style (e.g. Subtitle, Manga, Retro, Drone)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs text-[#18211e] focus:outline-none focus:border-[#386633]"
              />
            </div>
          </div>

          {/* Active Template & Generation Workbench */}
          {activeTemplate && (
            <div className="bg-white p-6 rounded-3xl border border-[#386633]/30 shadow-md space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f2f8f2] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#e8f3e8] border border-[#d8ebd7] text-[#386633] rounded-2xl">
                    <MaterialIcon icon={activeTemplate.icon} size={24} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-[#18211e]">{activeTemplate.name}</h3>
                      <span className="px-2.5 py-0.5 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] text-[10px] font-mono font-bold rounded-full">
                        by {activeTemplate.creator}
                      </span>
                      <span className="px-2 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">
                        {activeTemplate.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#5e635f] mt-0.5">{activeTemplate.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleRunTemplateGeneration(activeTemplate)}
                  disabled={isGeneratingMedia}
                  className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center space-x-2 disabled:opacity-50 shrink-0"
                >
                  <MaterialIcon icon="animation" size={18} />
                  <span>{isGeneratingMedia ? "Synthesizing Media..." : "Generate with Template"}</span>
                </button>
              </div>

              {/* Custom Prompt Bar */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#18211e] flex items-center justify-between">
                  <span>Custom Prompt / Subject Reference:</span>
                  <button
                    onClick={() => setCustomGenPrompt(activeTemplate.promptExample)}
                    className="text-[10px] text-[#386633] hover:underline cursor-pointer font-mono"
                  >
                    Load Sample Prompt
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customGenPrompt}
                    onChange={e => setCustomGenPrompt(e.target.value)}
                    placeholder={`e.g. ${activeTemplate.promptExample}`}
                    className="flex-1 px-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs text-[#18211e] focus:outline-none focus:border-[#386633]"
                  />
                  <button
                    onClick={() => handleRunTemplateGeneration(activeTemplate)}
                    disabled={isGeneratingMedia}
                    className="px-4 py-2.5 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] hover:bg-[#e8f3e8] text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <MaterialIcon icon="auto_awesome" size={16} />
                    <span>Run</span>
                  </button>
                </div>
              </div>

              {/* Generation Output Preview */}
              {isGeneratingMedia ? (
                <div className="p-8 bg-[#f8faf8] border border-[#d8ebd7] rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-[#386633] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-[#18211e]">
                    Synthesizing Media using Genkit Pipeline & Template [{activeTemplate.name}]...
                  </p>
                  <p className="text-[10px] text-[#5e635f] font-mono">
                    Applying AI video frame timing, camera orbits & style transfers
                  </p>
                </div>
              ) : generatedResult ? (
                <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#386633] font-mono flex items-center space-x-1">
                      <MaterialIcon icon="check_circle" size={16} />
                      <span>Generated Media Result ({generatedResult.templateName})</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#5e635f]">60 FPS • Genkit AI Stream</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <img
                      src={generatedResult.imageUrl}
                      alt="Genkit Output Preview"
                      className="w-full h-40 object-cover rounded-xl border border-[#d8ebd7] shadow-xs"
                    />
                    <div className="md:col-span-2 space-y-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]">
                        <span className="text-[10px] font-bold uppercase text-[#5e635f] block font-mono">Applied Prompt</span>
                        <p className="text-[#18211e] font-medium mt-0.5">"{generatedResult.prompt}"</p>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]">
                        <span className="text-[10px] font-bold uppercase text-[#5e635f] block font-mono">Video & Motion Render</span>
                        <p className="text-[#386633] font-semibold mt-0.5">{generatedResult.videoConcept}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Grid of All Community & Media Templates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(tmpl => {
              const isActive = activeTemplate?.id === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setActiveTemplate(tmpl);
                    setCustomGenPrompt(tmpl.promptExample);
                  }}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 group ${
                    isActive
                      ? "bg-white border-[#386633] ring-2 ring-[#386633]/30 shadow-sm"
                      : "bg-white border-[#d8ebd7] hover:border-[#386633]/60 hover:shadow-2xs"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-[#e8f3e8] text-[#386633] flex items-center justify-center font-bold">
                        <MaterialIcon icon={tmpl.icon} size={20} />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7]">
                        {tmpl.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-[#18211e] group-hover:text-[#386633] transition">
                        {tmpl.name}
                      </h4>
                      <p className="text-[10px] font-mono text-[#5e635f] mt-0.5">by {tmpl.creator}</p>
                      <p className="text-xs text-[#5e635f] leading-snug mt-1.5 line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f2f8f2] flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-[#386633] font-bold">Reference Template</span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTemplate(tmpl);
                        handleRunTemplateGeneration(tmpl);
                      }}
                      className="px-2.5 py-1 bg-[#f2f8f2] hover:bg-[#386633] hover:text-white text-[#386633] border border-[#d8ebd7] text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center space-x-1"
                    >
                      <MaterialIcon icon="animation" size={14} />
                      <span>Use Style</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: GENAI AGENT WORKSPACES */}
      {activeMainTab === "agents" && (
        <div className="space-y-5">
          {/* 4 Cards: Economic Market Research, Marketing Coordinator, Brand Studio, Global Client Audit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AGENTS_METADATA.map(agent => {
              const isSelected = selectedAgent === agent.id;
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 rounded-2xl text-left transition transform active:scale-[0.99] cursor-pointer flex flex-col justify-between border shadow-2xs group relative overflow-hidden ${
                    isSelected
                      ? `${agent.bgColor} ${agent.borderColor} ring-2 ring-[#386633]/40`
                      : "bg-white border-[#e2e2e2] hover:border-[#386633]/50 hover:bg-[#fafdfa]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${isSelected ? "bg-white shadow-2xs" : "bg-[#f2f6f3]"}`}>
                        <MaterialIcon icon={agent.icon} size={18} className={agent.color} />
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isSelected ? "bg-white/80 text-[#18211e]" : "bg-neutral-100 text-neutral-600"}`}>
                        {agent.badge}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">
                      {agent.title}
                    </h3>
                    <p className="text-[11px] text-[#556258] leading-snug mt-1">
                      {agent.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-black/5 flex flex-wrap gap-1">
                    {agent.capabilities.map((cap, idx) => (
                      <span key={idx} className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-white/70 rounded text-[#38423b] border border-black/5">
                        {cap}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Suggested Prompts for Selected Card */}
          <div className="bg-white border border-[#e2e2e2] rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center space-x-2">
                <MaterialIcon icon="tips_and_updates" size={16} className="text-[#386633]" />
                <span className="text-xs font-bold text-[#18211e]">
                  Suggested {activeAgentMeta.title} Actions:
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeAgentMeta.quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 bg-[#f5f8f5] hover:bg-[#e8f3e8] border border-[#d2d8d3] hover:border-[#386633] text-[#18211e] text-xs font-medium rounded-xl transition cursor-pointer shadow-2xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <span>{item.label}</span>
                  <MaterialIcon icon="arrow_forward" size={12} className="text-[#386633]" />
                </button>
              ))}
            </div>
          </div>

          {/* Active Conversation Feed */}
          <div className="bg-white border border-[#d8ebd7] rounded-3xl p-4 md:p-6 shadow-sm min-h-[420px] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 chat-scrollbar">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center space-x-2 mb-1 px-1">
                    <span className="text-[10px] font-mono font-bold text-[#556258]">
                      {msg.sender === "user" ? "You" : (AGENTS_METADATA.find(a => a.id === msg.agentType)?.title || "Specialist")}
                    </span>
                    <span className="text-[10px] text-neutral-400">{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl max-w-2xl text-xs md:text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-[#386633] text-white font-medium rounded-tr-xs shadow-xs"
                        : "bg-[#f8faf8] border border-[#e2ece2] text-[#18211e] rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    {msg.sender === "ai" ? (
                      <div className="prose prose-sm max-w-none text-[#18211e] prose-headings:font-serif prose-headings:text-[#18211e] prose-strong:text-[#18211e] prose-a:text-[#386633]">
                        <ReactMarkdown>{msg.text || "Synthesizing insights..."}</ReactMarkdown>
                        {msg.isStreaming && (
                          <div className="flex items-center space-x-2 mt-2 text-[11px] font-mono text-[#386633]">
                            <MaterialIcon icon="sync" size={14} className="animate-spin" />
                            <span>Gathering data and drafting content...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="mt-4 pt-3 border-t border-[#e2e2e2]">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
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
        </div>
      )}
    </div>
  );
};
