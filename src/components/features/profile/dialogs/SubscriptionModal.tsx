import React, { useState } from "react";
import Logger from "../../../../lib/Logger";
import { MaterialIcon } from "../../../MaterialIcon";
import { auth } from "../../../../lib/firebase";
import { upsertUserSubscription } from "@firebasegen/spresso-connector";

interface SubscriptionModalProps {
  onClose: () => void;
  subscriptionTier: string;
  vipPrice: string;
  execPrice: string;
}

export function SubscriptionModal({ onClose, subscriptionTier, vipPrice, execPrice }: SubscriptionModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpgradeSubscription = async (tier: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("User not authenticated.");
      await upsertUserSubscription({ tier });
      onClose(); // Optional: close on success or handle state update
    } catch (err: any) {
      Logger.error("Failed to update subscription:", err);
      setErrorMsg(err.message || "Failed to update subscription");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--md-sys-color-surface)] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[var(--md-sys-color-outline-variant)] shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">Membership Plan Options</h3>
          <button onClick={onClose} className="text-[var(--md-sys-color-on-surface-variant)] cursor-pointer">
            <MaterialIcon icon="close" size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 text-[var(--color-accent-orange)] text-xs rounded-2xl flex items-center space-x-2">
            <MaterialIcon icon="error" size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <div
            onClick={() => handleUpgradeSubscription("VIP Member")}
            className={`p-4 rounded-2xl border cursor-pointer transition ${subscriptionTier === "VIP Member" ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--md-sys-color-outline-variant)]"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--md-sys-color-on-surface)]">VIP Member ({vipPrice})</span>
              {subscriptionTier === "VIP Member" && <span className="text-[10px] font-bold text-emerald-600">Active</span>}
            </div>
            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">Unlimited free delivery + priority AI access</p>
          </div>

          <div
            onClick={() => handleUpgradeSubscription("Executive Tier")}
            className={`p-4 rounded-2xl border cursor-pointer transition ${subscriptionTier === "Executive Tier" ? "border-emerald-500 bg-emerald-500/10" : "border-[var(--md-sys-color-outline-variant)]"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[var(--md-sys-color-on-surface)]">Executive Tier ({execPrice})</span>
              {subscriptionTier === "Executive Tier" && <span className="text-[10px] font-bold text-emerald-600">Active</span>}
            </div>
            <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] mt-1">Dedicated AI concierge + 10% grocery cash back</p>
          </div>
        </div>
      </div>
    </div>
  );
}
