import Logger from "../../../../lib/Logger";
import React, { useState } from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { upsertUserPreference } from "@firebasegen/spresso-connector";

interface AppPreferencesWidgetProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function AppPreferencesWidget({ theme, onToggleTheme }: AppPreferencesWidgetProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    try {
      await upsertUserPreference({
        pushNotifications: nextVal,
        emailAlerts: true,
        theme: theme
      });
    } catch (err) {
      Logger.error("Failed to update preferences:", err);
    }
  };

  const handleThemeToggleClick = async () => {
    onToggleTheme();
    try {
      await upsertUserPreference({
        pushNotifications: notificationsEnabled,
        emailAlerts: true,
        theme: theme === "dark" ? "light" : "dark"
      });
    } catch (err) {
      Logger.error("Failed to save theme preference:", err);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
      <div className="flex items-center space-x-2 text-[var(--md-sys-color-primary)] font-bold">
        <MaterialIcon icon="settings" size={20} />
        <span className="text-sm">App Preferences</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]">
          <div className="flex items-center space-x-3">
            <MaterialIcon icon={theme === "dark" ? "dark_mode" : "light_mode"} size={20} className="text-[var(--md-sys-color-primary)]" />
            <div>
              <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Appearance Theme</p>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">{theme === "dark" ? "Dark Mode Active" : "Light Mode Active"}</p>
            </div>
          </div>
          <button
            onClick={handleThemeToggleClick}
            className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${theme === "dark" ? "bg-[var(--md-sys-color-primary)]" : "bg-neutral-300"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === "dark" ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]">
          <div className="flex items-center space-x-3">
            <MaterialIcon icon="notifications" size={20} className="text-[var(--md-sys-color-primary)]" />
            <div>
              <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Push Notifications</p>
              <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Order updates, price drops & delivery tracking</p>
            </div>
          </div>
          <button
            onClick={handleToggleNotifications}
            className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${notificationsEnabled ? "bg-[var(--md-sys-color-primary)]" : "bg-neutral-300"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
