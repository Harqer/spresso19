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

              </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
