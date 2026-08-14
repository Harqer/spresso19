import React, { useState } from "react";
import { getCleanDisplayName, getUserPhotoURL } from "../../../lib/userUtils";
import { MaterialIcon } from "../../MaterialIcon";

interface UserAvatarProps {
  user?: any | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = "sm", className = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const photoURL = getUserPhotoURL(user);
  const displayName = getCleanDisplayName(user);

  // Compute initials cleanly (e.g. "No Way" -> "NW", "Shaolin" -> "S")
  const getInitials = (name: string) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return parts[0].charAt(0).toUpperCase();
  };

  const initials = getInitials(displayName);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl"
  }[size];

  if (photoURL && !imageFailed) {
    return (
      <img
        src={photoURL}
        alt={displayName || "User Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${sizeClasses} rounded-full object-cover flex-shrink-0 border border-[var(--md-sys-color-outline-variant)] shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold flex items-center justify-center flex-shrink-0 shadow-xs ${className}`}
    >
      {initials ? initials : <MaterialIcon icon="person" size={size === "lg" ? 28 : size === "md" ? 20 : 16} />}
    </div>
  );
};
