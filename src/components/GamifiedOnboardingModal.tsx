import Logger from "../lib/Logger";
import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../lib/firebase";
import { MaterialIcon } from "./MaterialIcon";
import { SpressoLogo } from "./SpressoLogo";

interface GamifiedOnboardingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onComplete?: (userPreferences: { vibes: string[]; radius: number; locationEnabled: boolean }) => void;
  onAskAI?: (query: string, image?: string) => void;
  onSelectTryOn?: (product: any) => void;
}

const STYLE_VIBES = [
  { id: "gourmet", label: "Food and kitchen", icon: "restaurant" },
  { id: "streetwear", label: "Streetwear", icon: "checkroom" },
  { id: "luxury", label: "Luxury", icon: "diamond" },
  { id: "tech", label: "Wearables and tech", icon: "devices" },
];

export const GamifiedOnboardingModal: React.FC<GamifiedOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const toggleVibe = (id: string) => {
    setSelectedVibes((current) =>
      current.includes(id) ? current.filter((vibe) => vibe !== id) : [...current, id],
    );
  };

  const handleFinishOnboarding = async () => {
    if (selectedVibes.length === 0) {
      setErrorMessage("Choose at least one interest to continue.");
      return;
    }
    if (!auth.currentUser) {
      setErrorMessage("Please sign in to save your interests.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const initializeOnboarding = httpsCallable(functions, "initializeOnboarding");
      await initializeOnboarding({ uid: auth.currentUser.uid, interests: selectedVibes });
      onComplete?.({ vibes: selectedVibes, radius: 0, locationEnabled: false });
      onClose();
    } catch (error) {
      Logger.error("Failed to save onboarding preferences", error);
      setErrorMessage("Unable to save your interests right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-lg">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#191d16]">
        <div className="flex items-center justify-between border-b border-[#dfe4d7] p-5 dark:border-[#43483e]">
          <SpressoLogo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#f2f8f2] dark:hover:bg-[#30352d]"
          >
            <MaterialIcon icon="close" size={20} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#18211e] dark:text-[#e1e4d9]">What are you shopping for?</h2>
            <p className="mt-2 text-sm text-[#5e635f] dark:text-[#c3c8bb]">
              Choose a few interests to shape your recommendations. You can change these later.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {STYLE_VIBES.map((vibe) => {
              const selected = selectedVibes.includes(vibe.id);
              return (
                <button
                  key={vibe.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleVibe(vibe.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-[#446732] bg-[#eef7e9] text-[#29491d]"
                      : "border-[#dfe4d7] bg-white text-[#18211e] hover:bg-[#f7faf5]"
                  }`}
                >
                  <MaterialIcon icon={vibe.icon} size={22} />
                  <span className="text-sm font-semibold">{vibe.label}</span>
                </button>
              );
            })}
          </div>

          {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
        </div>

        <div className="flex justify-end border-t border-[#dfe4d7] p-4 dark:border-[#43483e]">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleFinishOnboarding}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#446732] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#385428] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isSaving ? "Saving..." : "Continue"}</span>
            {!isSaving && <MaterialIcon icon="arrow_forward" size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
