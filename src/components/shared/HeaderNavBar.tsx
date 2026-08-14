import React from "react";
import { SpressoLogo } from "../SpressoLogo";
import { IconButton } from "@/src/components/shared/IconButton";
import { MaterialIcon } from "../MaterialIcon";

import { UserAvatar } from "@/src/components/features/profile/UserAvatar";

interface HeaderNavBarProps {
  userLocation: string | null;
  searchRadius: number;
  totalCartCount: number;
  theme: "light" | "dark";
  user?: any;
  onToggleMobileMenu: () => void;
  onToggleTheme: () => void;
  onOpenDynamicThemeModal: () => void;
  onOpenLocationModal: () => void;
  onOpenCartDrawer: () => void;
  onOpenProfile?: () => void;
}

export const HeaderNavBar: React.FC<HeaderNavBarProps> = ({
  userLocation,
  searchRadius,
  totalCartCount,
  theme,
  user,
  onToggleMobileMenu,
  onToggleTheme,
  onOpenDynamicThemeModal,
  onOpenLocationModal,
  onOpenCartDrawer,
  onOpenProfile
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--md-sys-color-surface-container-low)] z-30 flex items-center px-4 justify-between transition-colors">
      <div className="flex items-center space-x-3">
        <IconButton
          icon="menu"
          onClick={onToggleMobileMenu}
          title="Open Menu"
          className="p-2 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl md:hidden transition cursor-pointer"
          size={24}
        />
      </div>

      <div className="flex items-center space-x-1">
        <IconButton
          icon={theme === "dark" ? "light_mode" : "dark_mode"}
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        />

        <IconButton
          icon="location_on"
          onClick={onOpenLocationModal}
          title={userLocation ? `Location: ${userLocation} (${searchRadius} mi)` : "Set location and search radius"}
          hasDot={!!userLocation}
        />

        <IconButton
          icon="shopping_bag"
          onClick={onOpenCartDrawer}
          title="Shopping Cart"
          badgeCount={totalCartCount}
        />

        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            title="Open Profile Settings"
            className="p-1 rounded-full hover:opacity-80 transition cursor-pointer ml-1"
          >
            <UserAvatar user={user} size="sm" />
          </button>
        )}
      </div>
    </header>
  );
};
