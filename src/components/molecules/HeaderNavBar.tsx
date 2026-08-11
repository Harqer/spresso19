import React from "react";
import { SpressoLogo } from "../SpressoLogo";
import { IconButton } from "../atoms/IconButton";
import { MaterialIcon } from "../MaterialIcon";

interface HeaderNavBarProps {
  userLocation: string | null;
  searchRadius: number;
  totalCartCount: number;
  theme: "light" | "dark";
  onToggleMobileMenu: () => void;
  onToggleTheme: () => void;
  onOpenDynamicThemeModal: () => void;
  onOpenLocationModal: () => void;
  onOpenCartDrawer: () => void;
}

export const HeaderNavBar: React.FC<HeaderNavBarProps> = ({
  userLocation,
  searchRadius,
  totalCartCount,
  theme,
  onToggleMobileMenu,
  onToggleTheme,
  onOpenDynamicThemeModal,
  onOpenLocationModal,
  onOpenCartDrawer
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-[var(--md-sys-color-surface-container-low)] border-b border-[var(--md-sys-color-outline-variant)] z-30 flex items-center px-4 justify-between transition-colors">
      <div className="flex items-center space-x-3">
        <IconButton
          icon="menu"
          onClick={onToggleMobileMenu}
          title="Open Menu"
          className="p-2 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl md:hidden transition cursor-pointer"
          size={24}
        />
        <div className="flex items-center space-x-2">
          <SpressoLogo variant="full" showTextLeft={true} width={70} height={40} />
          <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] rounded-full shadow-xs">
            v1.9 AI
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <IconButton
          icon="palette"
          onClick={onOpenDynamicThemeModal}
          title="Material You Dynamic Color Theme Generator"
          className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container-lowest)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-primary)] transition cursor-pointer flex items-center justify-center shadow-xs"
        />

        <IconButton
          icon={theme === "dark" ? "light_mode" : "dark_mode"}
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container-lowest)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] transition cursor-pointer flex items-center justify-center shadow-xs"
        />

        <IconButton
          icon="location_on"
          onClick={onOpenLocationModal}
          title={userLocation ? `Location: ${userLocation} (${searchRadius} mi)` : "Set location and search radius"}
          hasDot={!!userLocation}
        />

        <button
          onClick={onOpenCartDrawer}
          className="relative p-2.5 rounded-xl bg-[var(--md-sys-color-surface-container-lowest)] border border-[var(--md-sys-color-outline-variant)] hover:bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] transition cursor-pointer flex items-center justify-center shadow-xs"
          title="Shopping Cart"
          aria-label="Shopping Cart"
        >
          <MaterialIcon icon="shopping_bag" size={20} className="text-[var(--md-sys-color-primary)]" />
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-[#ff5e1a] dark:bg-[#ff6b00] text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
