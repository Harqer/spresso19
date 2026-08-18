import React, { useRef } from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { TravelExpense } from "../../../../types";

interface ReceiptScannerProps {
  isScanningReceipt: boolean;
  handleReceiptUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  newExpenseMerchant: string;
  setNewExpenseMerchant: (val: string) => void;
  newExpenseAmount: string;
  setNewExpenseAmount: (val: string) => void;
  newExpenseCategory: string;
  setNewExpenseCategory: (val: string) => void;
  handleAddExpense: (e: React.FormEvent) => void;
  tripExpenses: TravelExpense[];
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({
  isScanningReceipt, handleReceiptUpload,
  newExpenseMerchant, setNewExpenseMerchant,
  newExpenseAmount, setNewExpenseAmount,
  newExpenseCategory, setNewExpenseCategory,
  handleAddExpense, tripExpenses
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-[var(--md-sys-color-surface-container-lowest)] rounded-3xl p-5 border border-[var(--md-sys-color-outline-variant)] space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Smart Receipt Scanner</h3>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleReceiptUpload} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isScanningReceipt}
          className="px-3 py-1.5 bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)] rounded-full text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
        >
          <MaterialIcon icon={isScanningReceipt ? "sync" : "document_scanner"} size={16} className={isScanningReceipt ? "animate-spin text-[var(--md-sys-color-primary)]" : "text-[var(--md-sys-color-primary)]"} />
          <span>{isScanningReceipt ? "Scanning Receipt..." : "Scan Receipt"}</span>
        </button>
      </div>

      <form onSubmit={handleAddExpense} className="space-y-3">
        <input
          type="text"
          value={newExpenseMerchant}
          onChange={e => setNewExpenseMerchant(e.target.value)}
          placeholder="Merchant / Vendor Name"
          className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            value={newExpenseAmount}
            onChange={e => setNewExpenseAmount(e.target.value)}
            placeholder="Amount ($)"
            className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none font-mono"
          />
          <select
            value={newExpenseCategory}
            onChange={e => setNewExpenseCategory(e.target.value)}
            className="w-full py-2 px-3 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs outline-none"
          >
            <option value="Dining">Dining</option>
            <option value="Flight">Flight</option>
            <option value="Hotel">Hotel</option>
            <option value="Shopping">Shopping</option>
            <option value="Transport">Transport</option>
            <option value="Activities">Activities</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <MaterialIcon icon="add_circle" size={16} />
          <span>Log Travel Expense</span>
        </button>
      </form>

      <div className="space-y-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]">
        <h4 className="text-xs font-bold text-[var(--md-sys-color-on-surface-variant)] uppercase tracking-wider">Logged Expenses</h4>
        {tripExpenses.map(exp => (
          <div key={exp.id} className="flex items-center justify-between p-2.5 bg-[var(--md-sys-color-surface-container-low)] rounded-xl text-xs">
            <div>
              <span className="font-bold block">{exp.merchant}</span>
              <span className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{exp.category} • {exp.date}</span>
            </div>
            <span className="font-mono font-bold text-[var(--md-sys-color-primary)]">${exp.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
