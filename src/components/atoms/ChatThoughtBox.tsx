import React from "react";
import { MaterialIcon } from "../MaterialIcon";

export const ChatThoughtBox: React.FC<{ thought?: string }> = ({ thought }) => {
  if (!thought?.trim()) return null;
  return (
    <div className="flex items-start space-x-2 p-2.5 rounded-xl bg-[var(--md-sys-color-surface-variant)]/40 border border-[var(--md-sys-color-outline-variant)]/50 max-w-md my-1">
      <MaterialIcon icon="auto_awesome" size={14} className="text-[var(--md-sys-color-primary)]/70 mt-0.5" />
      <p className="text-xs italic text-[var(--md-sys-color-on-surface-variant)]/80 leading-relaxed">{thought}</p>
    </div>
  );
};
