import React from "react";
import { MaterialIcon } from "../../../MaterialIcon";

interface BudgetOverviewProps {
  totalSpent: number;
  budgetTotal: number;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ totalSpent, budgetTotal }) => {
  const percent = Math.min(100, (totalSpent / (budgetTotal || 1)) * 100);

  return (
    <div className="bg-gradient-to-br from-[var(--md-sys-color-primary-container)] to-[var(--md-sys-color-surface-container)] rounded-3xl p-6 border border-[var(--md-sys-color-outline-variant)] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">Trip Budget & Expenses</span>
        <MaterialIcon icon="account_balance_wallet" size={20} className="text-[var(--md-sys-color-primary)]" />
      </div>

      <div>
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-black font-mono text-[var(--md-sys-color-on-surface)]">${totalSpent.toFixed(2)}</span>
          <span className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)]">Budget: ${budgetTotal}</span>
        </div>
        
        <div className="w-full bg-[var(--md-sys-color-surface-container-high)] h-2.5 rounded-full overflow-hidden mt-2">
          <div
            className="bg-[var(--md-sys-color-primary)] h-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
