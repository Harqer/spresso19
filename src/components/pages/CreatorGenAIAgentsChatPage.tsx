import React, { useState } from "react";
import { User } from "firebase/auth";
import { MaterialIcon } from "../MaterialIcon";
import { ProductItem } from "../../types";
import { AgentTemplateCard } from "../molecules/AgentTemplateCard";
import { AgentAvatarBadge } from "../atoms/AgentAvatarBadge";
import { CreatorAgentChatPanel } from "../organisms/CreatorAgentChatPanel";

export type GenAIAgentType = "ECONOMIC_RESEARCH_AGENT" | "MARKETING_COORDINATOR_AGENT" | "BRAND_STUDIO_AGENT" | "GLOBAL_CLIENT_AUDIT_AGENT";
export interface AgentMeta { id: GenAIAgentType; title: string; badge: string; subtitle: string; icon: string; color: string; bgColor: string; borderColor: string; capabilities: string[]; quickPrompts: { label: string; prompt: string }[]; }
export interface CreativeTemplate { id: string; name: string; creator: string; category: "Community" | "Image" | "Video" | "Prompting" | "Experimental"; description: string; icon: string; promptExample: string; }
export interface ChatMessage { id: string; sender: "user" | "ai"; text: string; timestamp: string; agentType?: GenAIAgentType; isStreaming?: boolean; }

export const AGENTS_METADATA: AgentMeta[] = [
  { id: "ECONOMIC_RESEARCH_AGENT", title: "Global Economic Research Agent", badge: "Live Markets", subtitle: "Real-time commodities & macro trends", icon: "public", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200", capabilities: ["Inflation Indexing", "Consumer Sentiment", "Supply Chain FX"], quickPrompts: [{ label: "Commodity Forecasts", prompt: "Summarize the latest commodity forecasts for Q3." }] },
  { id: "MARKETING_COORDINATOR_AGENT", title: "Regional Marketing Coordinator", badge: "Campaigns", subtitle: "Cross-channel promotion & local SEO", icon: "campaign", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200", capabilities: ["A/B Testing Copy", "Ad Spend Allocation", "Social Listening"], quickPrompts: [{ label: "Draft a Social Post", prompt: "Draft a social post highlighting our new eco-friendly line." }] },
  { id: "BRAND_STUDIO_AGENT", title: "Creative Brand Studio Agent", badge: "Gen Media", subtitle: "Visual assets & style enforcement", icon: "palette", color: "text-pink-700", bgColor: "bg-pink-50", borderColor: "border-pink-200", capabilities: ["Video Rendering", "Tone of Voice", "Image Variations"], quickPrompts: [{ label: "Generate Ad Concept", prompt: "Generate an ad concept for a summer apparel launch." }] },
  { id: "GLOBAL_CLIENT_AUDIT_AGENT", title: "Global Client Audit Agent", badge: "Security", subtitle: "Compliance, risk & account forensics", icon: "shield", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", capabilities: ["Fraud Detection", "GDPR Checks", "Contract Analysis"], quickPrompts: [{ label: "Run Compliance Check", prompt: "Run a compliance check on our latest user data policy." }] }
];

export const CREATIVE_TEMPLATES: CreativeTemplate[] = [
  { id: "tmpl-1", name: "Cinematic Product Reveal", creator: "SpressoStudio", category: "Video", description: "A dramatic 60fps slow-pan across luxury textures with cinematic lighting.", icon: "movie", promptExample: "Generate a slow panning shot of a sleek leather handbag under dramatic spotlight." },
  { id: "tmpl-2", name: "Minimalist E-Comm", creator: "AI_Design_Lab", category: "Image", description: "Clean white background, soft shadow, perfect for Shopify / web catalogs.", icon: "image", promptExample: "A minimalist studio shot of a modern ceramic coffee mug on a white background." },
  { id: "tmpl-3", name: "GenZ UGC Style", creator: "TrendSetter_99", category: "Community", description: "Handheld phone style, dynamic, bright colors, TikTok ready format.", icon: "smartphone", promptExample: "A bright, energetic vertical video of someone unboxing a new sneaker." },
  { id: "tmpl-4", name: "Cyberpunk Glow", creator: "NeonDreamer", category: "Experimental", description: "Neon rim lights, dark moody backgrounds, tech-wear styling.", icon: "lightbulb", promptExample: "A futuristic smartwatch floating with glowing neon blue rim lighting." },
  { id: "tmpl-5", name: "High-Fashion Editorial", creator: "Vogue_AI", category: "Prompting", description: "Complex prompt template for achieving magazine-cover quality output.", icon: "auto_awesome", promptExample: "A high-fashion editorial photo of a model wearing an avant-garde dress, studio lighting." }
];

interface CreatorGenAIAgentsChatPageProps {
  user: User | null;
  userName?: string;
  products?: ProductItem[];
  userLocation?: string | null;
  onRequestLocationPermission?: () => void;
  onAskAI?: (query: string) => void;
}

export const CreatorGenAIAgentsChatPage: React.FC<CreatorGenAIAgentsChatPageProps> = ({ user, userName = "Creator", products = [], userLocation, onRequestLocationPermission }) => {
  const [activeMainTab, setActiveMainTab] = useState<"agents" | "templates">("templates");
  const [selectedAgent, setSelectedAgent] = useState<GenAIAgentType>("ECONOMIC_RESEARCH_AGENT");
  const [templateCategory, setTemplateCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTemplate, setActiveTemplate] = useState<CreativeTemplate | null>(CREATIVE_TEMPLATES[0]);
  const [customGenPrompt, setCustomGenPrompt] = useState<string>("");
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{ prompt: string; templateName: string; imageUrl: string; videoConcept: string; } | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome-creator-1", sender: "ai", agentType: "ECONOMIC_RESEARCH_AGENT", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text: `Welcome, ${userName}! Select a workspace below to conduct market research, coordinate campaigns, create on-brand descriptions, or audit global client accounts.` }]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const activeAgentMeta = AGENTS_METADATA.find(a => a.id === selectedAgent) || AGENTS_METADATA[0];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const aiMsgId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: "user", text: textToSend, timestamp: timeStr, agentType: selectedAgent }, { id: aiMsgId, sender: "ai", text: "", timestamp: timeStr, agentType: selectedAgent, isStreaming: true }]);
    if (!customText) setInputPrompt("");
    setIsGenerating(true);
    try {
      const response = await fetch("/api/chat/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: textToSend, userName, location: userLocation, agentType: selectedAgent }) });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6).trim();
            if (rawData === "[DONE]") break;
            try { const parsed = JSON.parse(rawData); if (parsed.text) { accumulatedText += parsed.text; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: accumulatedText } : m)); } } catch {}
          }
        }
      }
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
    } catch { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: "Unable to process request at this moment.", isStreaming: false } : m)); } finally { setIsGenerating(false); }
  };

  const handleRunTemplateGeneration = async (tmpl?: CreativeTemplate) => {
    const t = tmpl || activeTemplate || CREATIVE_TEMPLATES[0];
    const promptToUse = customGenPrompt.trim() || t.promptExample;
    setIsGeneratingMedia(true); setGeneratedResult(null);

    try {
      const res = await fetch("/api/creator/generate-campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeName: `${userName}'s ${t.name}`, category: t.category, productFeatures: promptToUse, targetAudience: "E-Commerce Shoppers" }) });
      const data = await res.json();
      setGeneratedResult({ prompt: promptToUse, templateName: t.name, imageUrl: data.imageUrl || "", videoConcept: `${data.campaign?.marketingCampaign?.socialCopy || `Creative studio render synthesized.`}` });
    } catch { 
      setGeneratedResult({ prompt: promptToUse, templateName: t.name, imageUrl: "", videoConcept: `Creative studio processing completed using reference template [${t.name}].` }); 
    } finally { 
      setIsGeneratingMedia(false); 
    }
  };

  const filteredTemplates = CREATIVE_TEMPLATES.filter(tmpl => (templateCategory === "ALL" || tmpl.category === templateCategory) && (!searchQuery.trim() || tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.creator.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.description.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="bg-white border border-[#d8ebd7] rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5"><div className="w-12 h-12 rounded-2xl bg-[#e8f3e8] border border-[#386633]/20 flex items-center justify-center text-[#386633]"><MaterialIcon icon="auto_awesome" size={28} /></div><div><div className="flex items-center space-x-2"><h2 className="text-xl font-serif font-bold text-[#18211e] dark:text-[#e1e4d9]">Spresso Genkit Creative Studio</h2><span className="px-2.5 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">AI Video & Image Hub</span></div><p className="text-xs text-[#52645b] mt-0.5">Community Templates • Video & Image Generation • Style Reference Randomizer</p></div></div>
          <div className="flex items-center p-1 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] shrink-0">
            <button onClick={() => setActiveMainTab("templates")} className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${activeMainTab === "templates" ? "bg-[#386633] text-white shadow-xs" : "text-[#52645b] hover:text-[#18211e]"}`}><MaterialIcon icon="grid_view" size={16} /><span>Community & Media ({CREATIVE_TEMPLATES.length})</span></button>
            <button onClick={() => setActiveMainTab("agents")} className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${activeMainTab === "agents" ? "bg-[#386633] text-white shadow-xs" : "text-[#52645b] hover:text-[#18211e]"}`}><MaterialIcon icon="deployed_code_account" size={16} /><span>GenAI Agent Workspaces</span></button>
          </div>
        </div>
      </div>
      {activeMainTab === "templates" && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">{["ALL", "Community", "Image", "Video", "Prompting", "Experimental"].map(cat => ( <button key={cat} onClick={() => setTemplateCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${templateCategory === cat ? "bg-[#386633] text-white shadow-xs" : "bg-[#f2f8f2] text-[#5e635f]"}`}>{cat === "ALL" ? `All (${CREATIVE_TEMPLATES.length})` : cat}</button> ))}</div>
              <button onClick={() => { const c = CREATIVE_TEMPLATES[0]; setActiveTemplate(c); setCustomGenPrompt(c.promptExample); }} className="px-4 py-2 bg-gradient-to-r from-[#386633] to-[#2c5227] text-white text-xs font-bold rounded-xl shadow-xs"><MaterialIcon icon="shuffle" size={16} /><span>Randomize Style</span></button>
            </div>
            <div className="relative"><MaterialIcon icon="search" size={18} className="absolute left-3.5 top-3 text-[#5e635f]" /><input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search community templates..." className="w-full pl-10 pr-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs" /></div>
          </div>
          {activeTemplate && (
            <div className="bg-white p-6 rounded-3xl border border-[#386633]/30 shadow-md space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f2f8f2] pb-4">
                <div className="flex items-center space-x-3"><div className="p-3 bg-[#e8f3e8] border border-[#d8ebd7] text-[#386633] rounded-2xl"><MaterialIcon icon={activeTemplate.icon} size={24} /></div><div><div className="flex items-center space-x-2"><h3 className="text-base font-bold">{activeTemplate.name}</h3><span className="px-2.5 py-0.5 bg-[#f2f8f2] text-[#386633] text-[10px] rounded-full">by {activeTemplate.creator}</span></div><p className="text-xs text-[#5e635f] mt-0.5">{activeTemplate.description}</p></div></div>
                <button onClick={() => handleRunTemplateGeneration(activeTemplate)} disabled={isGeneratingMedia} className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl shadow-xs">{isGeneratingMedia ? "Synthesizing..." : "Generate with Template"}</button>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold flex items-center justify-between"><span>Custom Prompt:</span><button onClick={() => setCustomGenPrompt(activeTemplate.promptExample)} className="text-[10px] text-[#386633]">Load Sample</button></label>
                <div className="flex items-center gap-2"><input type="text" value={customGenPrompt} onChange={e => setCustomGenPrompt(e.target.value)} placeholder={activeTemplate.promptExample} className="flex-1 px-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs" /><button onClick={() => handleRunTemplateGeneration(activeTemplate)} disabled={isGeneratingMedia} className="px-4 py-2.5 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] text-xs font-bold rounded-xl"><MaterialIcon icon="auto_awesome" size={16} /><span>Run</span></button></div>
              </div>
              {isGeneratingMedia ? <div className="p-8 bg-[#f8faf8] border border-[#d8ebd7] rounded-2xl text-center space-y-3"><div className="w-10 h-10 border-4 border-[#386633] border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-xs font-bold">Synthesizing Media...</p></div> : generatedResult ? (
                <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold text-[#386633] flex items-center space-x-1"><MaterialIcon icon="check_circle" size={16} /><span>Generated Media Result ({generatedResult.templateName})</span></span></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {generatedResult.imageUrl ? <img src={generatedResult.imageUrl} alt="Output" className="w-full h-40 object-cover rounded-xl border border-[#d8ebd7] shadow-xs" /> : <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-xl border border-[#d8ebd7]"><MaterialIcon icon="image" size={32} className="text-gray-400" /></div>}
                    <div className="md:col-span-2 space-y-2 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]"><span className="text-[10px] font-bold text-[#5e635f] block">Applied Prompt</span><p className="font-medium mt-0.5">"{generatedResult.prompt}"</p></div>
                      <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]"><span className="text-[10px] font-bold text-[#5e635f] block">Video & Motion Render</span><p className="text-[#386633] font-semibold mt-0.5">{generatedResult.videoConcept}</p></div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(tmpl => <AgentTemplateCard key={tmpl.id} tmpl={tmpl} isActive={activeTemplate?.id === tmpl.id} onSelect={() => { setActiveTemplate(tmpl); setCustomGenPrompt(tmpl.promptExample); }} onUseStyle={() => handleRunTemplateGeneration(tmpl)} />)}
          </div>
        </div>
      )}
      {activeMainTab === "agents" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AGENTS_METADATA.map(agent => (
              <button key={agent.id} onClick={() => setSelectedAgent(agent.id)} className={`p-4 rounded-2xl text-left transition transform active:scale-[0.99] cursor-pointer flex flex-col justify-between border shadow-2xs group relative overflow-hidden ${selectedAgent === agent.id ? `${agent.bgColor} ${agent.borderColor} ring-2 ring-[#386633]/40` : "bg-white border-[#e2e2e2] hover:border-[#386633]/50 hover:bg-[#fafdfa]"}`}>
                <div>
                  <AgentAvatarBadge icon={agent.icon} color={agent.color} isSelected={selectedAgent === agent.id} badge={agent.badge} />
                  <h3 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">{agent.title}</h3>
                  <p className="text-[11px] text-[#556258] leading-snug mt-1">{agent.subtitle}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-black/5 flex flex-wrap gap-1">
                  {agent.capabilities.map((cap, idx) => <span key={idx} className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-white/70 rounded text-[#38423b] border border-black/5">{cap}</span>)}
                </div>
              </button>
            ))}
          </div>
          <div className="bg-white border border-[#e2e2e2] rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2 px-1"><div className="flex items-center space-x-2"><MaterialIcon icon="tips_and_updates" size={16} className="text-[#386633]" /><span className="text-xs font-bold">Suggested Actions:</span></div></div>
            <div className="flex flex-wrap gap-2">
              {activeAgentMeta.quickPrompts.map((item, idx) => (
                <button key={idx} onClick={() => handleSendMessage(item.prompt)} disabled={isGenerating} className="px-3 py-1.5 bg-[#f5f8f5] hover:bg-[#e8f3e8] border border-[#d2d8d3] text-xs font-medium rounded-xl shadow-2xs flex items-center space-x-1.5"><span className="text-[#18211e]">{item.label}</span><MaterialIcon icon="arrow_forward" size={12} className="text-[#386633]" /></button>
              ))}
            </div>
          </div>
          <CreatorAgentChatPanel messages={messages} isGenerating={isGenerating} inputPrompt={inputPrompt} setInputPrompt={setInputPrompt} handleSendMessage={() => handleSendMessage()} activeAgentMeta={activeAgentMeta} AGENTS_METADATA={AGENTS_METADATA} />
        </div>
      )}
    </div>
  );
};
