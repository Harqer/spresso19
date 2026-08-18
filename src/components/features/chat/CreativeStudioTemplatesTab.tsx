import React from "react";
import { MaterialIcon } from "../../MaterialIcon";
import { AgentTemplateCard } from "@/src/components/features/chat/AgentTemplateCard";

export const CreativeStudioTemplatesTab = ({
  creativeTemplates,
  templateCategory,
  setTemplateCategory,
  searchQuery,
  setSearchQuery,
  activeTemplate,
  setActiveTemplate,
  customGenPrompt,
  setCustomGenPrompt,
  handleRunTemplateGeneration,
  isGeneratingMedia,
  generatedResult
}: any) => {
  const filteredTemplates = creativeTemplates.filter((tmpl: any) => 
    (templateCategory === "ALL" || tmpl.category === templateCategory) && 
    (!searchQuery.trim() || tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.creator.toLowerCase().includes(searchQuery.toLowerCase()) || tmpl.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["ALL", "Community", "Image", "Video", "Prompting", "Experimental"].map(cat => ( 
              <button key={cat} onClick={() => setTemplateCategory(cat)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${templateCategory === cat ? "bg-[#386633] text-white shadow-xs" : "bg-[#f2f8f2] text-[#5e635f]"}`}>
                {cat === "ALL" ? `All (${creativeTemplates.length})` : cat}
              </button> 
            ))}
          </div>
          <button onClick={() => { if (creativeTemplates.length === 0) return; const c = creativeTemplates[Math.floor(Math.random() * creativeTemplates.length)]; setActiveTemplate(c); setCustomGenPrompt(c.promptExample); }} className="px-4 py-2 bg-gradient-to-r from-[#386633] to-[#2c5227] text-white text-xs font-bold rounded-xl shadow-xs">
            <MaterialIcon icon="shuffle" size={16} /><span>Randomize Style</span>
          </button>
        </div>
        <div className="relative">
          <MaterialIcon icon="search" size={18} className="absolute left-3.5 top-3 text-[#5e635f]" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search community templates..." className="w-full pl-10 pr-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs" />
        </div>
      </div>
      {activeTemplate && (
        <div className="bg-white p-6 rounded-3xl border border-[#386633]/30 shadow-md space-y-4 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f2f8f2] pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-[#e8f3e8] border border-[#d8ebd7] text-[#386633] rounded-2xl">
                <MaterialIcon icon={activeTemplate.icon} size={24} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold">{activeTemplate.name}</h3>
                  <span className="px-2.5 py-0.5 bg-[#f2f8f2] text-[#386633] text-[10px] rounded-full">by {activeTemplate.creator}</span>
                </div>
                <p className="text-xs text-[#5e635f] mt-0.5">{activeTemplate.description}</p>
              </div>
            </div>
            <button onClick={() => handleRunTemplateGeneration(activeTemplate)} disabled={isGeneratingMedia} className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl shadow-xs">
              {isGeneratingMedia ? "Synthesizing..." : "Generate with Template"}
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold flex items-center justify-between">
              <span>Custom Prompt:</span>
              <button onClick={() => setCustomGenPrompt(activeTemplate.promptExample)} className="text-[10px] text-[#386633]">Load Sample</button>
            </label>
            <div className="flex items-center gap-2">
              <input type="text" value={customGenPrompt} onChange={e => setCustomGenPrompt(e.target.value)} placeholder={activeTemplate.promptExample} className="flex-1 px-4 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs" />
              <button onClick={() => handleRunTemplateGeneration(activeTemplate)} disabled={isGeneratingMedia} className="px-4 py-2.5 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] text-xs font-bold rounded-xl">
                <MaterialIcon icon="auto_awesome" size={16} /><span>Run</span>
              </button>
            </div>
          </div>
          {isGeneratingMedia ? (
            <div className="p-8 bg-[#f8faf8] border border-[#d8ebd7] rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#386633] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold">Synthesizing Media...</p>
            </div>
          ) : generatedResult ? (
            <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#386633] flex items-center space-x-1">
                  <MaterialIcon icon="check_circle" size={16} /><span>Generated Media Result ({generatedResult.templateName})</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {generatedResult.imageUrl ? (
                  <img src={generatedResult.imageUrl} alt="Output" className="w-full h-40 object-cover rounded-xl border border-[#d8ebd7] shadow-xs" />
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-xl border border-[#d8ebd7]">
                    <MaterialIcon icon="image" size={32} className="text-gray-400" />
                  </div>
                )}
                <div className="md:col-span-2 space-y-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]">
                    <span className="text-[10px] font-bold text-[#5e635f] block">Applied Prompt</span>
                    <p className="font-medium mt-0.5">"{generatedResult.prompt}"</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#d8ebd7]">
                    <span className="text-[10px] font-bold text-[#5e635f] block">Video & Motion Render</span>
                    <p className="text-[#386633] font-semibold mt-0.5">{generatedResult.videoConcept}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((tmpl: any) => (
          <AgentTemplateCard 
            key={tmpl.id} 
            tmpl={tmpl} 
            isActive={activeTemplate?.id === tmpl.id} 
            onSelect={() => { setActiveTemplate(tmpl); setCustomGenPrompt(tmpl.promptExample); }} 
            onUseStyle={() => handleRunTemplateGeneration(tmpl)} 
          />
        ))}
      </div>
    </div>
  );
};
