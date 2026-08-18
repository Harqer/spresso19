import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { AgentAvatarBadge } from "@/src/components/features/chat/AgentAvatarBadge";
import { CreatorAgentChatPanel } from "@/src/components/features/chat/CreatorAgentChatPanel";

export const CreativeStudioAgentsTab = ({
  agentsMetadata,
  selectedAgent,
  setSelectedAgent,
  handleSendMessage,
  isGenerating,
  messages,
  inputPrompt,
  setInputPrompt
}: any) => {
  const activeAgentMeta = agentsMetadata.find((a: any) => a.id === selectedAgent) || agentsMetadata[0];

  if (!activeAgentMeta) {
    return <div className="p-4 text-center">Loading Workspaces...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {agentsMetadata.map((agent: any) => (
          <button 
            key={agent.id} 
            onClick={() => setSelectedAgent(agent.id)} 
            className={`p-4 rounded-2xl text-left transition transform active:scale-[0.99] cursor-pointer flex flex-col justify-between border shadow-2xs group relative overflow-hidden ${selectedAgent === agent.id ? `${agent.bgColor} ${agent.borderColor} ring-2 ring-[#386633]/40` : "bg-white border-[#e2e2e2] hover:border-[#386633]/50 hover:bg-[#fafdfa]"}`}
          >
            <div>
              <AgentAvatarBadge icon={agent.icon} color={agent.color} isSelected={selectedAgent === agent.id} badge={agent.badge} />
              <h3 className="text-xs font-bold text-[#18211e] font-serif group-hover:text-[#386633] transition">{agent.title}</h3>
              <p className="text-[11px] text-[#556258] leading-snug mt-1">{agent.subtitle}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-black/5 flex flex-wrap gap-1">
              {agent.capabilities.map((cap: string, idx: number) => (
                <span key={idx} className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-white/70 rounded text-[#38423b] border border-black/5">{cap}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
      <div className="bg-white border border-[#e2e2e2] rounded-2xl p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-2">
            <MaterialIcon icon="tips_and_updates" size={16} className="text-[#386633]" />
            <span className="text-xs font-bold">Suggested Actions:</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeAgentMeta.quickPrompts.map((item: any, idx: number) => (
            <button 
              key={idx} 
              onClick={() => handleSendMessage(item.prompt)} 
              disabled={isGenerating} 
              className="px-3 py-1.5 bg-[#f5f8f5] hover:bg-[#e8f3e8] border border-[#d2d8d3] text-xs font-medium rounded-xl shadow-2xs flex items-center space-x-1.5"
            >
              <span className="text-[#18211e]">{item.label}</span>
              <MaterialIcon icon="arrow_forward" size={12} className="text-[#386633]" />
            </button>
          ))}
        </div>
      </div>
      <CreatorAgentChatPanel 
        messages={messages} 
        isGenerating={isGenerating} 
        inputPrompt={inputPrompt} 
        setInputPrompt={setInputPrompt} 
        handleSendMessage={() => handleSendMessage()} 
        activeAgentMeta={activeAgentMeta} 
        AGENTS_METADATA={agentsMetadata} 
      />
    </div>
  );
};
