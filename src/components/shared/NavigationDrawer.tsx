import React from "react";
import { SpressoLogo } from "../SpressoLogo";
import { MaterialIcon } from "../MaterialIcon";
import { User } from "firebase/auth";
import { getCleanDisplayName } from "../../lib/userUtils";
import { UserAvatar } from "@/src/components/features/profile/UserAvatar";

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

interface NavigationDrawerProps {
  navItems: NavItem[];
  activeTab: string;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  user: User | null;
  onSelectTab: (tabId: string) => void;
  onCloseMobileMenu: () => void;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  navItems,
  activeTab,
  sidebarOpen,
  mobileMenuOpen,
  user,
  onSelectTab,
  onCloseMobileMenu,
  onToggleSidebar,
  onLogout
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={onCloseMobileMenu}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Navigation Drawer Sidebar */}
      <aside
        className={`h-full fixed left-0 top-0 bg-[var(--md-sys-color-surface-container-low)] border-r border-[var(--md-sys-color-outline-variant)] transition-all duration-300 flex flex-col p-3 pt-3 space-y-3 ${
          mobileMenuOpen ? "translate-x-0 w-64 shadow-2xl z-50" : "-translate-x-full md:translate-x-0 z-40"
        } ${sidebarOpen ? "md:w-64" : "md:w-16"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--md-sys-color-outline-variant)] min-h-14">
          <div className="flex md:hidden items-center justify-between w-full">
            <span className="text-xl font-black font-sans text-[var(--md-sys-color-on-surface)] tracking-tight lowercase">spresso</span>
            <button
              onClick={onCloseMobileMenu}
              className="p-1.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl transition cursor-pointer"
              title="Close Menu"
            >
              <MaterialIcon icon="close" size={22} />
            </button>
          </div>

          <div className="hidden md:flex items-center justify-between w-full">
            {sidebarOpen ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xl font-black font-sans text-[var(--md-sys-color-on-surface)] tracking-tight lowercase">spresso</span>
                <button
                  onClick={onToggleSidebar}
                  className="p-1.5 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl transition cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <MaterialIcon icon="menu_open" size={22} />
                </button>
              </div>
            ) : (
              <button
                onClick={onToggleSidebar}
                className="w-full flex items-center justify-center p-1 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container)] rounded-xl transition cursor-pointer"
                title="Expand Sidebar"
              >
                <span className="text-sm font-black font-sans text-[var(--md-sys-color-primary)] lowercase">s</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Item List */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1 chat-scrollbar">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobileMenu();
                }}
                className={`w-full flex items-center ${
                  sidebarOpen ? "justify-between px-3" : "md:justify-center px-3 md:px-0"
                } py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold shadow-xs"
                    : "text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] hover:text-[var(--md-sys-color-on-surface)]"
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3">
                  <MaterialIcon icon={item.icon} size={20} className={isActive ? "text-[var(--md-sys-color-on-primary)]" : "text-[var(--md-sys-color-primary)]"} />
                  <span className={`block ${sidebarOpen ? "md:block" : "md:hidden"}`}>{item.label}</span>
                </div>

                {item.count !== undefined && item.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded-full font-bold ${
                      isActive ? "bg-[#ff5e1a] dark:bg-[#ff6b00] text-white" : "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]"
                    } ${sidebarOpen ? "md:inline-block" : "md:hidden"}`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="mt-auto pt-3 border-t border-[var(--md-sys-color-outline-variant)]">
          {user ? (
            <div className={`flex items-center justify-between ${sidebarOpen ? "p-2 bg-[var(--md-sys-color-surface-container)]" : "md:justify-center p-2 bg-transparent"} rounded-2xl`}>
              <div
                onClick={() => onSelectTab("profile")}
                title="Open Profile Settings"
                className="flex items-center space-x-2.5 overflow-hidden cursor-pointer group hover:opacity-80 transition-opacity"
              >
                <UserAvatar user={user} size="sm" />
                <div className={`overflow-hidden min-w-0 ${sidebarOpen ? "md:block" : "md:hidden"}`}>
                  <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)] group-hover:text-[var(--md-sys-color-primary)] truncate">{getCleanDisplayName(user)}</p>
                  {(user.email || user.providerData?.[0]?.email || user.phoneNumber) && (
                    <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate">{user.email || user.providerData?.[0]?.email || user.phoneNumber}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className={`p-1.5 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0 ml-1 ${sidebarOpen ? "md:block" : "md:hidden"}`}
              >
                <MaterialIcon icon="logout" size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
