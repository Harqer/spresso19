import React from "react";
import { MaterialIcon } from "../MaterialIcon";

interface IconButtonProps {
  icon: string;
  onClick: () => void;
  title: string;
  badgeCount?: number;
  hasDot?: boolean;
  className?: string;
  iconClassName?: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  badgeCount,
  hasDot,
  className = "relative p-2.5 rounded-xl hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] transition cursor-pointer flex items-center justify-center",
  iconClassName,
  size = 20
}) => {
  return (
    <button
      onClick={onClick}
      className={className}
      title={title}
      aria-label={title}
    >
      <MaterialIcon icon={icon} size={size} className={iconClassName} />
      {hasDot && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#b84a39] shadow-xs" />
      )}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[#b84a39] text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
          {badgeCount}
        </span>
      )}
    </button>
  );
};
