import React from "react";
import { MaterialIcon } from "../../MaterialIcon";

export interface GroundingSource {
  title: string;
  url: string;
}

export const ChatGroundingSources: React.FC<{ sources?: GroundingSource[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--md-sys-color-on-surface-variant)]/60 mb-1">Sources</p>
      <div className="space-y-1">
        {sources.slice(0, 3).map((source, idx) => (
          <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-xs text-[var(--md-sys-color-primary)] hover:underline truncate">
            <MaterialIcon icon="link" size={12} />
            <span className="truncate">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
};
