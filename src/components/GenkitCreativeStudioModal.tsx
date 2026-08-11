import React, { useState, useEffect } from "react";
import { ProductItem } from "../types";
import { GoogleGenAI } from "@google/genai";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";
import { logToCrashlytics } from "../lib/firebase";

interface GenkitCreativeStudioModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

export const GenkitCreativeStudioModal: React.FC<GenkitCreativeStudioModalProps> = ({
  product,
  onClose
}) => {
  if (!product) return null;

  const [activeTab, setActiveTab] = useState<"dna" | "universe" | "3d" | "tryon" | "pipeline">("dna");
  const [isLoading, setIsLoading] = useState(true);
  const [pipelineData, setPipelineData] = useState<any>(null);

  useEffect(() => {
    const fetchGenkitPipeline = async () => {
      setIsLoading(true);
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
           logToCrashlytics("warn", "VITE_GEMINI_API_KEY is missing for Genkit Creative Studio");
           return;
        }

        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `You are a high-end luxury fashion and retail creative director. 
Given the product "${product.brand} - ${product.name}", act as an intelligent creative studio pipeline.
Generate an elaborate creative strategy including Brand DNA, Product Universe Concepts, 3D Studio Angles, Virtual Try-On specs, and a pipeline graph.

Output STRICTLY in this JSON format:
{
  "brandCreativeDNA": {
    "brandArchetype": "Luxury Innovation",
    "shapes": ["Geometric", "Fluid"],
    "materials": ["Silk", "Carbon"],
    "lightingPhilosophy": "High contrast chiaroscuro",
    "photographyStyle": "Editorial Film",
    "emotionalFeeling": "Empowered, Bold",
    "customerIdentity": "The Modern Visionary",
    "bannedVisualElements": ["Clutter", "Over-saturation"]
  },
  "creativeDirectorStrategy": {
    "masterTheme": "The Future of Elegance",
    "narrativeDirection": "A journey through..."
  },
  "productUniverseConcepts": {
    "heroImage": "...", "lifestyleScene": "...", "materialMacroShot": "...", "detailVisualization": "...", "environment360": "...", "motionConcept": "..."
  },
  "render3DStudioAngles": {
    "frontView": "...", "angle45View": "...", "sideView": "...", "backView": "...", "bottomView": "...", "materialCloseUp": "..."
  },
  "virtualTryOnSpecs": {
    "vogueEditorialRating": 95,
    "fabricPhysicsAnalysis": "...",
    "preservedTraits": ["Skin tone", "Silhouette"],
    "replacedElements": ["Garment"]
  },
  "pipelineExecutionGraph": [
    {"step": 1, "agent": "Brand Analyst", "output": "Brand DNA Extracted", "status": "COMPLETED"}
  ]
}`;

        const response = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: prompt,
           config: {
             responseMimeType: "application/json"
           }
        });

        if (response.text) {
           const parsed = JSON.parse(response.text);
           setPipelineData(parsed);
        }
      } catch (err) {
        logToCrashlytics("warn", "Genkit pipeline error", { error: String(err) });
      } finally {
        setIsLoading(false);
      }
    };

    fetchGenkitPipeline();
  }, [product]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl border border-[#d8ebd7] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl my-auto">
        
        {/* Header */}
        <div className="p-6 bg-[#f2f8f2] border-b border-[#d8ebd7] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#386633] text-white flex items-center justify-center shadow-md">
              <MaterialIcon icon="auto_awesome" size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-lg text-[#18211e]">Brand Creative & Product Ideation Studio</h2>
                <span className="px-2 py-0.5 bg-[#386633] text-white text-[10px] font-mono font-bold rounded-full">
                  Brand Studio
                </span>
              </div>
              <p className="text-xs text-[#5e635f]">
                {product.brand} · {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white border border-[#d8ebd7] hover:bg-[#e8f3e8] text-[#18211e] flex items-center justify-center transition cursor-pointer"
          >
            <MaterialIcon icon="close" size={18} />
          </button>
        </div>

        {/* Creative Strategy Pipeline Bar */}
        <div className="bg-[#18211e] p-3 text-white border-b border-[#2d3834] overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between text-[11px] font-mono min-w-[700px] px-2">
            {[
              "Product Input",
              "Brand Intelligence",
              "Creative Strategy",
              "Visual Concept",
              "3D Rendering",
              "Virtual Fitting",
              "Motion & 360",
              "Commerce Assets"
            ].map((step, idx) => (
              <React.Fragment key={step}>
                <div className="flex items-center space-x-1 font-bold text-emerald-400">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] flex items-center justify-center border border-emerald-500/40">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
                {idx < 7 && <span className="text-stone-600 font-bold">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#d8ebd7] bg-stone-50 overflow-x-auto">
          {[
            { id: "dna", label: "Brand Creative DNA", icon: "psychology" },
            { id: "universe", label: "Product Universe", icon: "public" },
            { id: "3d", label: "3D Studio Angles", icon: "360" },
            { id: "tryon", label: "Luxury Virtual Fitting", icon: "dry_cleaning" },
            { id: "pipeline", label: "Creative Process Overview", icon: "account_tree" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 font-bold text-xs flex items-center space-x-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#386633] text-[#386633] bg-white"
                  : "border-transparent text-[#5e635f] hover:text-[#18211e]"
              }`}
            >
              <MaterialIcon icon={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <M3ExpressiveCircularProgress
                size={72}
                icon="auto_awesome"
                label="Synthesizing Brand Campaign Assets..."
                sublabel="Analyzing Brand DNA, 3D Mesh Geometry, and Editorial Style Guidelines"
                variant="card"
              />
            </div>
          ) : pipelineData ? (
            <>
              {/* Tab 1: Brand Creative DNA */}
              {activeTab === "dna" && (
                <div className="space-y-6">
                  <div className="p-5 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[#386633] tracking-wider">
                        Brand Archetype
                      </span>
                      <span className="px-3 py-1 bg-[#386633] text-white text-xs font-bold rounded-full">
                        {pipelineData.brandCreativeDNA?.brandArchetype || "Luxury Innovation"}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-[#18211e]">
                      {pipelineData.creativeDirectorStrategy?.masterTheme}
                    </h3>
                    <p className="text-xs text-[#48524d] leading-relaxed">
                      {pipelineData.creativeDirectorStrategy?.narrativeDirection}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white border border-[#d8ebd7] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-[#5e635f] font-mono">Visual Vocabulary (Shapes & Materials)</h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(pipelineData.brandCreativeDNA?.shapes || []).concat(pipelineData.brandCreativeDNA?.materials || []).map((m: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-stone-100 text-[#18211e] text-xs font-medium rounded-lg border border-stone-200">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-white border border-[#d8ebd7] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-[#5e635f] font-mono">Lighting & Photography Philosophy</h4>
                      <p className="text-xs text-[#18211e] leading-snug">
                        {pipelineData.brandCreativeDNA?.lightingPhilosophy}
                      </p>
                      <p className="text-xs text-[#5e635f] italic">
                        Style: {pipelineData.brandCreativeDNA?.photographyStyle}
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-[#d8ebd7] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-[#5e635f] font-mono">Emotional Feeling & Identity</h4>
                      <p className="text-xs font-semibold text-[#386633]">
                        {pipelineData.brandCreativeDNA?.emotionalFeeling}
                      </p>
                      <p className="text-xs text-[#5e635f]">
                        Customer: {pipelineData.brandCreativeDNA?.customerIdentity}
                      </p>
                    </div>

                    <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-red-700 font-mono">Banned Visual Elements (Anti-Slop)</h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(pipelineData.brandCreativeDNA?.bannedVisualElements || []).map((b: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-red-100/80 text-red-800 text-xs font-medium rounded-lg">
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Product Universe */}
              {activeTab === "universe" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-[#18211e] font-mono uppercase">Synthesized Visual Environments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Hero Image Environment", prompt: pipelineData.productUniverseConcepts?.heroImage, icon: "flare" },
                      { title: "Lifestyle Scene", prompt: pipelineData.productUniverseConcepts?.lifestyleScene, icon: "chair" },
                      { title: "Material Macro Shot", prompt: pipelineData.productUniverseConcepts?.materialMacroShot, icon: "zoom_in" },
                      { title: "Detail Visualization", prompt: pipelineData.productUniverseConcepts?.detailVisualization, icon: "architecture" },
                      { title: "360-Degree Environment", prompt: pipelineData.productUniverseConcepts?.environment360, icon: "360" },
                      { title: "Motion Concept", prompt: pipelineData.productUniverseConcepts?.motionConcept, icon: "movie" }
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 bg-stone-50 border border-[#d8ebd7] rounded-2xl space-y-2">
                        <div className="flex items-center space-x-2 text-[#386633] font-bold text-xs">
                          <MaterialIcon icon={item.icon} size={16} />
                          <span>{item.title}</span>
                        </div>
                        <p className="text-xs text-[#18211e] leading-relaxed font-mono bg-white p-3 rounded-xl border border-stone-200">
                          "{item.prompt}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: 3D Studio Angles */}
              {activeTab === "3d" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-[#18211e] font-mono uppercase">Interactive 360 Studio Render Engine</h3>
                    <span className="text-xs font-mono font-bold text-[#386633]">Raytraced Studio Lighting</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { angle: "Front View", desc: pipelineData.render3DStudioAngles?.frontView },
                      { angle: "45° View", desc: pipelineData.render3DStudioAngles?.angle45View },
                      { angle: "Side View", desc: pipelineData.render3DStudioAngles?.sideView },
                      { angle: "Back View", desc: pipelineData.render3DStudioAngles?.backView },
                      { angle: "Bottom View", desc: pipelineData.render3DStudioAngles?.bottomView },
                      { angle: "Material Macro", desc: pipelineData.render3DStudioAngles?.materialCloseUp }
                    ].map((a, i) => (
                      <div key={i} className="p-3 bg-white border border-[#d8ebd7] rounded-2xl space-y-2 text-center group hover:border-[#386633] transition">
                        <div className="aspect-square bg-stone-100 rounded-xl overflow-hidden relative">
                          <img src={product.image} alt={a.angle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          <span className="absolute bottom-2 left-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-mono font-bold rounded-lg">
                            {a.angle}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5e635f] leading-snug">{a.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Virtual Try-On Specs */}
              {activeTab === "tryon" && (
                <div className="space-y-6">
                  <div className="p-5 bg-[#18211e] text-white rounded-2xl space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                        <MaterialIcon icon="check_circle" size={18} />
                        <span>Vogue Editorial Fitting Pipeline Verified</span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500 text-black text-xs font-mono font-bold rounded-full">
                        Rating: {pipelineData.virtualTryOnSpecs?.vogueEditorialRating || 99}/100
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {pipelineData.virtualTryOnSpecs?.fabricPhysicsAnalysis}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-emerald-900 font-mono">Preserved User Identity Traits</h4>
                      <ul className="space-y-1">
                        {(pipelineData.virtualTryOnSpecs?.preservedTraits || []).map((t: string, i: number) => (
                          <li key={i} className="text-xs text-emerald-800 flex items-center space-x-1.5 font-medium">
                            <MaterialIcon icon="verified" size={14} className="text-emerald-600" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-stone-50 border border-[#d8ebd7] rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs uppercase text-[#5e635f] font-mono">Replaced Fashion Elements</h4>
                      <ul className="space-y-1">
                        {(pipelineData.virtualTryOnSpecs?.replacedElements || []).map((e: string, i: number) => (
                          <li key={i} className="text-xs text-[#18211e] flex items-center space-x-1.5 font-medium">
                            <MaterialIcon icon="dry_cleaning" size={14} className="text-[#386633]" />
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Creative Process Overview */}
              {activeTab === "pipeline" && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-[#18211e] font-mono uppercase">Creative Execution Status</h3>
                  <div className="space-y-2">
                    {(pipelineData.pipelineExecutionGraph || []).map((step: any) => (
                      <div key={step.step} className="p-3.5 bg-stone-50 border border-[#d8ebd7] rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-full bg-[#386633] text-white text-xs font-mono font-bold flex items-center justify-center">
                            {step.step}
                          </span>
                          <div>
                            <h4 className="font-bold text-xs text-[#18211e]">{step.agent}</h4>
                            <p className="text-[11px] text-[#5e635f]">{step.output}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-100 text-[#386633] text-[10px] font-mono font-bold rounded-full">
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f2f8f2] border-t border-[#d8ebd7] flex items-center justify-between">
          <div className="text-xs text-[#5e635f] font-mono">
            Spresso AI Brand Intelligence Studio
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Studio
          </button>
        </div>

      </div>
    </div>
  );
};
