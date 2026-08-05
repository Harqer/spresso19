import React from "react";
import { MaterialIcon } from "./MaterialIcon";

export interface M3ExpressiveCircularProgressProps {
  /** Size in pixels (e.g. 36, 48, 64, 80, 96) */
  size?: number;
  /** Progress percentage (0 - 100). If omitted or null, renders indeterminate expressive animation */
  progress?: number | null;
  /** Optional inner icon or status text */
  icon?: string;
  /** Primary indicator stroke color class or hex */
  colorClass?: string;
  /** Label underneath indicator e.g. "Processing payment...", "Generating video..." */
  label?: string;
  /** Secondary subtitle / phase status e.g. "ViTPose FP16 Pose Estimation Pass 2/3" */
  sublabel?: string;
  /** Variant style: 'default' | 'expressive-ring' | 'card' */
  variant?: "default" | "expressive-ring" | "card";
}

export const M3ExpressiveCircularProgress: React.FC<M3ExpressiveCircularProgressProps> = ({
  size = 56,
  progress = null,
  icon,
  colorClass = "stroke-[#446732] dark:stroke-[#a9d291]",
  label,
  sublabel,
  variant = "default"
}) => {
  const isIndeterminate = progress === null || progress === undefined;
  const strokeWidth = Math.max(4, Math.round(size / 10));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress || 0));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  const content = (
    <div className="flex flex-col items-center justify-center text-center space-y-3">
      {/* Expressive Indicator Container */}
      <div
        className="relative flex items-center justify-center shrink-0 select-none"
        style={{ width: size, height: size }}
      >
        {/* Outer subtle aura ring for expressive M3 depth */}
        <div className="absolute inset-0 rounded-full bg-[#446732]/10 dark:bg-[#a9d291]/15 animate-ping opacity-25 pointer-events-none" />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={`transform -rotate-90 ${isIndeterminate ? "animate-spin" : "transition-all duration-500 ease-out"}`}
          style={{ animationDuration: isIndeterminate ? "1.4s" : undefined }}
        >
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-[#dfe4d7] dark:stroke-[#353a2e] opacity-60"
          />

          {/* Foreground Expressive Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-300 ease-in-out`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: isIndeterminate ? circumference * 0.35 : strokeDashoffset,
              transition: "stroke-dashoffset 0.4s ease-in-out"
            }}
          />
        </svg>

        {/* Center Icon or Progress % Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          {icon ? (
            <MaterialIcon
              icon={icon}
              size={Math.round(size * 0.42)}
              className="text-[#446732] dark:text-[#a9d291] animate-pulse"
            />
          ) : !isIndeterminate ? (
            <span
              className="font-mono font-bold text-[#191d16] dark:text-[#e1e4d9]"
              style={{ fontSize: Math.max(10, Math.round(size * 0.24)) }}
            >
              {Math.round(clampedProgress)}%
            </span>
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#446732] dark:bg-[#a9d291] animate-ping" />
          )}
        </div>
      </div>

      {/* Expressive Labels */}
      {(label || sublabel) && (
        <div className="space-y-1 max-w-xs">
          {label && (
            <p className="text-xs font-semibold font-serif text-[#191d16] dark:text-[#e1e4d9] tracking-wide animate-pulse">
              {label}
            </p>
          )}
          {sublabel && (
            <p className="text-[11px] font-mono text-[#43483e] dark:text-[#c3c8bb] leading-snug">
              {sublabel}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <div className="p-5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl shadow-sm flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
