import React from "react";
import { MaterialIcon } from "../MaterialIcon";

interface IconButtonProps {
  icon: string;
  onClick: () => void;
  title: string;
  itemCount?: number;
  hasDot?: boolean;
  className?: string;
  iconClassName?: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  itemCount,
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
      aria-label={itemCount && itemCount > 0 ? `${title}, ${itemCount} items` : title}
    >
      <MaterialIcon icon={icon} size={size} className={iconClassName} />
      <span className="sr-only">{hasDot ? "Selected" : ""}</span>
    </button>
  );
};
