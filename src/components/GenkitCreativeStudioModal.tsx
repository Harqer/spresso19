import React, { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { z } from "zod";
import { ProductItem } from "../types";
import { functions, logToCrashlytics } from "../lib/firebase";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";

interface GenkitCreativeStudioModalProps {
  product: ProductItem | null;
  onClose: () => void;
}

const CampaignResponseSchema = z.object({
  success: z.literal(true),
  campaign: z.object({
    campaignTitle: z.string().min(1),
    socialMediaCopy: z.string().min(1),
    suggestedTags: z.array(z.string().min(1)).max(20),
  }),
});

type Campaign = z.infer<typeof CampaignResponseSchema>["campaign"];

export const GenkitCreativeStudioModal: React.FC<GenkitCreativeStudioModalProps> = ({ product, onClose }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!product) return;
    let active = true;

    const generateCampaign = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const generateCreatorCampaign = httpsCallable(functions, "generateCreatorCampaign");
        const response = await generateCreatorCampaign({
          productName: `${product.brand} ${product.name}`.trim(),
          campaignGoal: "Create clear, accurate product-discovery copy without availability or shipping claims.",
          targetAudience: "People comparing current merchant listings",
        });
        const parsed = CampaignResponseSchema.parse(response.data);
        if (active) setCampaign(parsed.campaign);
      } catch (error) {
        logToCrashlytics("warn", "Creator campaign request failed", { error: String(error) });
        if (active) setErrorMessage("Unable to create campaign ideas right now. Please try again.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void generateCampaign();
    return () => {
      active = false;
    };
  }, [product]);

  if (!product) return null;

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
                <span className="text-[11px] font-medium text-[#386633]">Brand studio</span>
              </div>
              <p className="text-xs text-[#5e635f]">
                {product.brand} · {product.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close creative campaign ideas"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#d8ebd7] bg-white text-[#18211e] transition hover:bg-[#e8f3e8]"
          >
            <MaterialIcon icon="close" size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <M3ExpressiveCircularProgress
              size={72}
              icon="auto_awesome"
              label="Creating campaign ideas..."
              sublabel="Writing product-focused copy for this listing"
              variant="card"
            />
          ) : errorMessage ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {errorMessage}
            </div>
          ) : campaign ? (
            <div className="space-y-6">
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-[#5e635f]">Campaign title</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#18211e]">{campaign.campaignTitle}</h3>
              </section>
              <section>
                <p className="text-xs font-bold uppercase tracking-wide text-[#5e635f]">Suggested copy</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#18211e]">{campaign.socialMediaCopy}</p>
              </section>
              {campaign.suggestedTags.length > 0 && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#5e635f]">Suggested tags</p>
                  <p className="mt-2 text-sm text-[#48524d]">{campaign.suggestedTags.join(", ")}</p>
                </section>
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
                        <span className="text-[11px] font-medium text-[#386633]">
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
      </div>
    </div>
  );
};
