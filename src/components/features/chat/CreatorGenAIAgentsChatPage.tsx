import Logger from "../../../lib/Logger";
import React, { useState } from "react";
import { User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";
import { GoogleGenAI } from "@google/genai";
import { MaterialIcon } from "../../MaterialIcon";
import { ProductItem } from "../../../types";
import { AgentTemplateCard } from "@/src/components/features/chat/AgentTemplateCard";
import { AgentAvatarBadge } from "@/src/components/features/chat/AgentAvatarBadge";
import { CreatorAgentChatPanel } from "@/src/components/features/chat/CreatorAgentChatPanel";

import { CreativeStudioTemplatesTab } from "@/src/components/features/chat/CreativeStudioTemplatesTab";
import { CreativeStudioAgentsTab } from "@/src/components/features/chat/CreativeStudioAgentsTab";

export type GenAIAgentType = "ECONOMIC_RESEARCH_AGENT" | "MARKETING_COORDINATOR_AGENT" | "BRAND_STUDIO_AGENT" | "GLOBAL_CLIENT_AUDIT_AGENT" | string;
export interface AgentMeta { id: GenAIAgentType; title: string; badge: string; subtitle: string; icon: string; color: string; bgColor: string; borderColor: string; capabilities: string[]; quickPrompts: { label: string; prompt: string }[]; }
export interface CreativeTemplate { id: string; name: string; creator: string; category: "Community" | "Image" | "Video" | "Prompting" | "Experimental"; description: string; icon: string; promptExample: string; }
export interface ChatMessage { id: string; sender: "user" | "ai"; text: string; timestamp: string; agentType?: GenAIAgentType; isStreaming?: boolean; }

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
  const [creativeTemplates, setCreativeTemplates] = useState<CreativeTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<CreativeTemplate | null>(null);
  const [customGenPrompt, setCustomGenPrompt] = useState<string>("");
  const [isGeneratingMedia, setIsGeneratingMedia] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<{ prompt: string; templateName: string; imageUrl: string; videoConcept: string; } | null>(null);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome-creator-1", sender: "ai", agentType: "ECONOMIC_RESEARCH_AGENT", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text: `Welcome, ${userName}! Select a workspace below to conduct market research, coordinate campaigns, create on-brand descriptions, or audit global client accounts.` }]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [agentsMetadata, setAgentsMetadata] = useState<AgentMeta[]>([]);

  React.useEffect(() => {
    const fetchTemplatesAndAgents = async () => {
      try {
        const creatorAgentTemplates = httpsCallable(functions, "creatorAgentTemplates");
        const res = await creatorAgentTemplates();
        const data = res.data as any;
        setCreativeTemplates(data.templates || []);
        if (data.templates?.length > 0) {
          setActiveTemplate(data.templates[0]);
        }
      } catch (err) {
        Logger.error("Failed to fetch creative templates", err);
        throw new Error("Missing Backend API - Needs Implementation");
      }

      try {
        const creatorAgentsMetadata = httpsCallable(functions, "creatorAgentsMetadata");
        const res = await creatorAgentsMetadata();
        const data = res.data as any;
        setAgentsMetadata(data.agents || []);
      } catch (err) {
        Logger.error("Failed to fetch agents metadata", err);
        throw new Error("Missing Backend API - Needs Implementation");
      }
    };
    fetchTemplatesAndAgents();
  }, []);

  const activeAgentMeta = agentsMetadata.find(a => a.id === selectedAgent) || agentsMetadata[0];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputPrompt;
    if (!textToSend.trim() || isGenerating) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const aiMsgId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: "user", text: textToSend, timestamp: timeStr, agentType: selectedAgent }, { id: aiMsgId, sender: "ai", text: "", timestamp: timeStr, agentType: selectedAgent, isStreaming: true }]);
    if (!customText) setInputPrompt("");
    setIsGenerating(true);
    try {
      const generateLiveApiToken = httpsCallable(functions, "generateLiveApiToken");
      const tokenRes = await generateLiveApiToken();
      const token = (tokenRes.data as any).token;

      const ai = new GoogleGenAI({
        apiKey: "none",
        httpOptions: { headers: { Authorization: `Bearer ${token}` } }
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: textToSend,
        config: {
          systemInstruction: `You are the ${activeAgentMeta.title}. Provide helpful advice for the Creator based on their request.`,
        }
      });

      let accumulatedText = "";
      for await (const chunk of responseStream) {
        if (chunk.text) {
          accumulatedText += chunk.text;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: accumulatedText } : m));
        }
      }
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));
    } catch (err) {
      Logger.warn("Error streaming creator response:", err);
      setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: "Unable to process request at this moment.", isStreaming: false } : m)); 
    } finally { setIsGenerating(false); }
  };

  const handleRunTemplateGeneration = async (tmpl?: CreativeTemplate) => {
    const t = tmpl || activeTemplate;
    if (!t) return;
    const promptToUse = customGenPrompt.trim() || t.promptExample;
    setIsGeneratingMedia(true); setGeneratedResult(null);

    try {
      const generateCreatorCampaign = httpsCallable(functions, "generateCreatorCampaign");
      const res = await generateCreatorCampaign({
        storeName: `${userName}'s ${t.name}`,
        category: t.category,
        productFeatures: promptToUse,
        targetAudience: "E-Commerce Shoppers"
      });
      const data = res.data as any;
      setGeneratedResult({ prompt: promptToUse, templateName: t.name, imageUrl: data.imageUrl || "", videoConcept: `${data.campaign?.marketingCampaign?.socialCopy || `Creative content generated.`}` });
    } catch (err) {
      Logger.error("Campaign generation error:", err);
      throw new Error("Missing Backend API - Needs Implementation");
    } finally { 
      setIsGeneratingMedia(false); 
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      <div className="bg-white border border-[#d8ebd7] rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5"><div className="w-12 h-12 rounded-2xl bg-[#e8f3e8] border border-[#386633]/20 flex items-center justify-center text-[#386633]"><MaterialIcon icon="auto_awesome" size={28} /></div><div><div className="flex items-center space-x-2"><h2 className="text-xl font-serif font-bold text-[#18211e] dark:text-[#e1e4d9]">Spresso Creative Studio</h2><span className="px-2.5 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">AI Video & Image Hub</span></div><p className="text-xs text-[#52645b] mt-0.5">Community Templates • Video & Image Generation • Style Reference Randomizer</p></div></div>
          <div className="flex items-center p-1 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] shrink-0">
            <button onClick={() => setActiveMainTab("templates")} className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${activeMainTab === "templates" ? "bg-[#386633] text-white shadow-xs" : "text-[#52645b] hover:text-[#18211e]"}`}><MaterialIcon icon="grid_view" size={16} /><span>Community & Media ({creativeTemplates.length})</span></button>
            <button onClick={() => setActiveMainTab("agents")} className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${activeMainTab === "agents" ? "bg-[#386633] text-white shadow-xs" : "text-[#52645b] hover:text-[#18211e]"}`}><MaterialIcon icon="deployed_code_account" size={16} /><span>GenAI Agent Workspaces</span></button>
          </div>
        </div>
      </div>
      {activeMainTab === "templates" && (
        <CreativeStudioTemplatesTab
          creativeTemplates={creativeTemplates}
          templateCategory={templateCategory}
          setTemplateCategory={setTemplateCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTemplate={activeTemplate}
          setActiveTemplate={setActiveTemplate}
          customGenPrompt={customGenPrompt}
          setCustomGenPrompt={setCustomGenPrompt}
          handleRunTemplateGeneration={handleRunTemplateGeneration}
          isGeneratingMedia={isGeneratingMedia}
          generatedResult={generatedResult}
        />
      )}
      {activeMainTab === "agents" && (
        <CreativeStudioAgentsTab
          agentsMetadata={agentsMetadata}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          handleSendMessage={handleSendMessage}
          isGenerating={isGenerating}
          messages={messages}
          inputPrompt={inputPrompt}
          setInputPrompt={setInputPrompt}
        />
      )}
    </div>
  );
};
