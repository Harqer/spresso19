import React from "react";
import { MaterialIcon } from "../MaterialIcon";

export interface ProblemDetails {
  type?: string;
  title: string;
  status?: number;
  detail?: string;
  instance?: string;
}

interface ProblemDetailsCardProps {
  error: ProblemDetails | string;
  onRetry?: () => void;
  className?: string;
}

export const ProblemDetailsCard: React.FC<ProblemDetailsCardProps> = ({ error, onRetry, className = "" }) => {
  const title = typeof error === "string" ? "Service Request Notice" : error.title || "Service Unavailable";
  const status = typeof error === "object" ? error.status : undefined;
  const detail = typeof error === "string" ? error : error.detail || "Unable to complete request. Please verify connection and retry.";

  return (
    <div className={`p-5 rounded-3xl bg-[var(--color-accent-orange)]/5 border border-[var(--color-accent-orange)]/20 text-[var(--md-sys-color-on-surface)] space-y-3 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)] flex items-center justify-center flex-shrink-0">
            <MaterialIcon icon="error_outline" size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">{title}</h4>
            {status && (
              <span className="inline-block px-2 py-0.5 mt-0.5 text-[10px] font-mono font-bold rounded-md bg-[var(--color-accent-orange)]/15 text-[var(--color-accent-orange)]">
                HTTP {status}
              </span>
            )}
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <MaterialIcon icon="refresh" size={14} />
            <span>Retry</span>
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] leading-relaxed pl-12">{detail}</p>
    </div>
  );
};
