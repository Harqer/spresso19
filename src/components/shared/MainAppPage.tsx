import React from "react";
import { ProductItem, HITLPayload, OrderRecord, CartItem } from "../../types";
import { HeaderNavBar } from "@/src/components/shared/HeaderNavBar";
import { NavigationDrawer, NavItem } from "@/src/components/shared/NavigationDrawer";
import { User } from "firebase/auth";

interface MainAppPageProps {
  navItems: NavItem[];
  activeTab: string;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  userLocation: string | null;
  searchRadius: number;
  totalCartCount: number;
  theme: "light" | "dark";
  user: User | null;
  onSelectTab: (tabId: string) => void;
  onToggleSidebar: () => void;
  onToggleMobileMenu: (open?: boolean) => void;
  onToggleTheme: () => void;
  onOpenDynamicThemeModal: () => void;
  onOpenLocationModal: () => void;
  onOpenCartDrawer: () => void;
  onLogout: () => void;
  hideSidebar?: boolean;
  hideTopNav?: boolean;
  children: React.ReactNode;
}

export const MainAppPage: React.FC<MainAppPageProps> = ({
  navItems,
  activeTab,
  sidebarOpen,
  mobileMenuOpen,
  userLocation,
  searchRadius,
  totalCartCount,
  theme,
  user,
  onSelectTab,
  onToggleSidebar,
  onToggleMobileMenu,
  onToggleTheme,
  onOpenDynamicThemeModal,
  onOpenLocationModal,
  onOpenCartDrawer,
  onLogout,
  hideSidebar = false,
  hideTopNav = false,
  children
}) => {
  return (
    <div className="min-h-screen bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] flex flex-col font-sans transition-colors">
      {!hideTopNav && (
        <HeaderNavBar
          userLocation={userLocation}
          searchRadius={searchRadius}
          totalCartCount={totalCartCount}
          theme={theme}
          onToggleMobileMenu={() => onToggleMobileMenu(true)}
          onToggleTheme={onToggleTheme}
          onOpenDynamicThemeModal={onOpenDynamicThemeModal}
          onOpenLocationModal={onOpenLocationModal}
          onOpenCartDrawer={onOpenCartDrawer}
        />
      )}

      <div className={`flex flex-1 pt-14 h-[calc(100vh)] ${hideTopNav ? '!pt-0' : ''}`}>
        {!hideSidebar && (
          <NavigationDrawer
            navItems={navItems}
            activeTab={activeTab}
            sidebarOpen={sidebarOpen}
            mobileMenuOpen={mobileMenuOpen}
            user={user}
            onSelectTab={onSelectTab}
            onCloseMobileMenu={() => onToggleMobileMenu(false)}
            onToggleSidebar={onToggleSidebar}
            onLogout={onLogout}
          />
        )}

        <main
          className={`flex-1 transition-all duration-300 overflow-y-auto ${
            hideSidebar 
              ? 'md:ml-0' 
              : (sidebarOpen ? "md:ml-64" : "md:ml-16")
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
