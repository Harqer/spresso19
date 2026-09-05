import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";

interface MembershipPlansWidgetProps {
  subscriptionTier: string;
  autoRenewDate: string;
  vipPrice: string;
  execPrice: string;
  onManage: () => void;
}

export function MembershipPlansWidget({ subscriptionTier, autoRenewDate, vipPrice, execPrice, onManage }: MembershipPlansWidgetProps) {
  return (
    <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 text-[var(--md-sys-color-primary)] font-bold">
          <MaterialIcon icon="stars" size={20} />
          <span className="text-sm">Membership & Plans</span>
        </div>
        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] font-medium">{autoRenewDate}</span>
      </div>
      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed">
        Review your current plan and billing details here. Benefits and pricing are shown from your account.
      </p>
      <button
        onClick={onManage}
        className="w-full py-2.5 rounded-2xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
      >
        Manage {subscriptionTier} ({subscriptionTier === "VIP Member" ? vipPrice : execPrice})
      </button>
    </div>
  );
}
