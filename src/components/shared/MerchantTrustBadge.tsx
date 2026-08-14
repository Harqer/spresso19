import React from "react";
import { ShieldCheck, AlertTriangle, PhoneCall, RotateCcw } from "lucide-react";

export interface MerchantTrustData {
  merchantName: string;
  merchantTrustScore: number;
  riskLevel: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  returnHandlingRating: "EXCELLENT" | "FAIR" | "POOR";
  supportAccessibility: "LIVE_SUPPORT_AVAILABLE" | "EMAIL_ONLY" | "UNRESPONSIVE";
  hasDedicatedCallCenter?: boolean;
  fulfillmentAccuracyRate?: number;
  trustBreakdown?: {
    returnsPolicyNote: string;
    supportChannelNote: string;
    itemAccuracyNote: string;
    userReviewConsensus: string;
  };
}

interface MerchantTrustBadgeProps {
  data: MerchantTrustData;
}

export const MerchantTrustBadge: React.FC<MerchantTrustBadgeProps> = ({ data }) => {
  const isHighTrust = data.merchantTrustScore >= 80;

  return (
    <div className={`my-4 rounded-xl border p-4 shadow-sm transition-all ${
      isHighTrust ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200" : "border-red-500/30 bg-red-950/20 text-red-200"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHighTrust ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-400" />
          )}
          <span className="font-semibold text-white">{data.merchantName}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-300">
        <div className="flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-zinc-400" />
          <span>Returns: <strong>{data.returnHandlingRating}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <PhoneCall className="h-3.5 w-3.5 text-zinc-400" />
          <span>Support: <strong>{data.supportAccessibility.replace(/_/g, " ")}</strong></span>
        </div>
      </div>

      {data.trustBreakdown?.returnsPolicyNote && (
        <p className="mt-2 text-xs text-zinc-400 italic">
          "{data.trustBreakdown.returnsPolicyNote}"
        </p>
      )}
    </div>
  );
};
