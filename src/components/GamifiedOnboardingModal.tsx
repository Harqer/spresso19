import Logger from "../lib/Logger";
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth, functions, storage } from "../lib/firebase";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import { MaterialIcon } from "./MaterialIcon";
import { SpressoLogo } from "./SpressoLogo";
import { AnimatedTicketCard } from "./features/orders/AnimatedTicketCard";

interface GamifiedOnboardingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onComplete?: (userPreferences: { vibes: string[]; radius: number; locationEnabled: boolean; avatarProfile?: AvatarProfile }) => void;
  onAskAI?: (query: string, image?: string) => void;
  onSelectTryOn?: (product: any) => void;
}

interface AvatarProfile {
  usePersonalAvatar: boolean;
  avatarUrl?: string;
  age?: number;
  height?: string;
  weight?: string;
  fitPreference?: "tailored" | "regular" | "relaxed" | "oversized";
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(["streetwear", "luxury"]);
  const [tryOnTested, setTryOnTested] = useState<boolean>(false);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [floatingXpText, setFloatingXpText] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | undefined>();
  const [usePersonalAvatar, setUsePersonalAvatar] = useState(true);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fitPreference, setFitPreference] = useState<AvatarProfile["fitPreference"]>("regular");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const triggerXpGain = (amount: number) => {
    setTotalXp((current) => current + amount);
    setFloatingXpText(`+${amount} XP`);
    window.setTimeout(() => setFloatingXpText(null), 900);
  };

  if (!isOpen) return null;

  const toggleVibe = (id: string) => {
    if (selectedVibes.includes(id)) {
      if (selectedVibes.length > 1) {
        setSelectedVibes(selectedVibes.filter((v) => v !== id));
      }
    } else {
      setSelectedVibes([...selectedVibes, id]);
      triggerXpGain(25);
    }
  };

  const handleTestTryOn = () => {
    setTryOnTested(true);
    triggerXpGain(150);
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
      const updateUserPreferences = httpsCallable(functions, "updateUserPreferences");
      let avatarUrl: string | undefined;
      if (usePersonalAvatar && avatarPhoto && auth.currentUser) {
        const avatarRef = ref(storage, `users/${auth.currentUser.uid}/avatar/onboarding.jpg`);
        await uploadString(avatarRef, avatarPhoto, "data_url", { contentType: "image/jpeg" });
        avatarUrl = await getDownloadURL(avatarRef);
      }
      await updateUserPreferences({
        onboardingCompleted: true,
        vibes: selectedVibes,
        cardSaved: false,
        wardrobeSynced: false,
        radius: 25,
        locationEnabled: true,
        avatarProfile: { usePersonalAvatar, avatarUrl, age: Number(age) || undefined, height: height || undefined, weight: weight || undefined, fitPreference },
      });
    } catch (e) {
      Logger.error("Failed to sync onboarding preferences", e);
    }
    
    onComplete?.({
      vibes: selectedVibes,
      radius: 25,
      locationEnabled: true,
      avatarProfile: { usePersonalAvatar, avatarUrl: undefined, age: Number(age) || undefined, height: height || undefined, weight: weight || undefined, fitPreference },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none animate-fade-in">
      
      {/* Floating XP Gain Toast */}
      <AnimatePresence>
        {floatingXpText && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: -40, scale: 1.2 }}
            exit={{ opacity: 0, y: -80 }}
            className="absolute top-12 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-stone-950 font-black px-6 py-2.5 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-white pointer-events-none"
          >
            <MaterialIcon icon="bolt" size={24} />
            <span className="text-lg tracking-wider font-mono">{floatingXpText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full max-w-lg bg-[#f8faf6] dark:bg-[#11140e] text-[#191d16] dark:text-[#e1e4d9] rounded-3xl shadow-2xl border border-[#dfe4d7] dark:border-[#43483e] overflow-hidden flex flex-col justify-between max-h-[92vh]">
        
        {/* Onboarding Header */}
        <div className="p-5 bg-white/90 dark:bg-[#191d16]/90 border-b border-[#dfe4d7] dark:border-[#43483e] backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SpressoLogo size="sm" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#446732] dark:text-[#a9d291]">
                  Quest {currentStep} of 5
                </span>
                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium flex items-center space-x-1">
                  <MaterialIcon icon="stars" size={12} />
                  <span>{totalXp} XP</span>
                </span>
              </div>
              <h2 className="text-sm font-bold truncate">Spresso Commerce Onboarding</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close onboarding"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full hover:bg-[#f2f8f2] dark:hover:bg-[#30352d]"
          >
            <MaterialIcon icon="close" size={20} />
          </button>
        </div>

        {/* Stepper Progress */}
        <div className="w-full bg-[#dfe4d7] dark:bg-[#282b24] h-1.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-[#446732] to-[#a9d291] h-full"
            initial={{ width: "20%" }}
            animate={{ width: `${(currentStep / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: Fashion Style & Category Preferences */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="style" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline">Select Your Style Profile</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Choose categories to tailor your personalized recommendations feed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left pt-2">
                {STYLE_VIBES.map((vibe) => {
                  const isSelected = selectedVibes.includes(vibe.id);
                  return (
                    <button
                      key={vibe.id}
                      onClick={() => toggleVibe(vibe.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? "bg-[#446732] dark:bg-[#a9d291] border-[#446732] dark:border-[#a9d291] text-white dark:text-[#191d16] shadow-md scale-[1.02]"
                          : "bg-white dark:bg-[#191d16] border-[#dfe4d7] dark:border-[#43483e] hover:border-[#446732]"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl text-white bg-gradient-to-br from-[#446732] to-[#a9d291]">
                          <MaterialIcon icon={vibe.icon} size={18} />
                        </div>
                        <span className="text-xs font-bold">{vibe.label}</span>
                      </div>
                      <MaterialIcon icon={isSelected ? "check_circle" : "add_circle_outline"} size={18} />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Virtual Try-On Demo */}
          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="accessibility_new" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline">Interactive Virtual Try-On</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Visualize garments, jackets, and accessories on your custom 3D avatar before placing an order.
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl shadow-md space-y-4 text-left">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold">Your try-on profile</h4>
                  <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">Optional. If you skip this, try-on uses a generated model instead.</p>
                  <label className="flex items-center gap-2 text-xs font-medium">
                    <input type="checkbox" checked={usePersonalAvatar} onChange={(event) => setUsePersonalAvatar(event.target.checked)} />
                    Use my photo as the avatar
                  </label>
                  {usePersonalAvatar && (
                    <label className="block cursor-pointer text-center py-2 px-3 bg-[#f8faf6] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl text-xs font-bold">
                      {avatarPhoto ? "Photo selected" : "Choose a photo or capture one"}
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setAvatarPhoto(String(reader.result));
                        reader.readAsDataURL(file);
                      }} />
                    </label>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input aria-label="Age" inputMode="numeric" placeholder="Age (optional)" value={age} onChange={(event) => setAge(event.target.value)} className="rounded-lg border p-2 text-xs bg-transparent" />
                    <input aria-label="Height" placeholder="Height (optional)" value={height} onChange={(event) => setHeight(event.target.value)} className="rounded-lg border p-2 text-xs bg-transparent" />
                    <input aria-label="Weight" placeholder="Weight (optional)" value={weight} onChange={(event) => setWeight(event.target.value)} className="rounded-lg border p-2 text-xs bg-transparent" />
                    <select aria-label="Fit preference" value={fitPreference} onChange={(event) => setFitPreference(event.target.value as AvatarProfile["fitPreference"])} className="rounded-lg border p-2 text-xs bg-transparent">
                      <option value="tailored">Tailored fit</option>
                      <option value="regular">Regular fit</option>
                      <option value="relaxed">Relaxed fit</option>
                      <option value="oversized">Oversized fit</option>
                    </select>
                  </div>
                </div>

                </div>
              </motion.div>
          )}

          {/* STEP 3: Adding Credit Card & Wallet Connection */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="credit_card" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline">Fast Checkout & Wallet Setup</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Add your credit card or connect Google Wallet for 1-tap checkout.
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl shadow-md space-y-3 text-left">
                <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">Payment details are collected only inside secure Stripe checkout. Spresso never asks for a raw card number here.</p>

                <p className="rounded-xl bg-[#f2f8f2] p-3 text-xs text-[#43483e] dark:bg-[#282b24] dark:text-[#c3c8bb]">
                  Payment details are added only when you review a merchant quote and continue through secure checkout.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Wardrobe Connection to Photo Gallery */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="photo_library" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black font-headline">Connect Wardrobe to Photo Gallery</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Sync your photo gallery to automatically scan your closet, organize outfits, and match complementary items.
                </p>
              </div>

              <div className="p-5 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-2xl shadow-md space-y-4 text-left">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#e8efe0] dark:bg-[#282b24] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shrink-0">
                    <MaterialIcon icon="sync" size={24} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Automatic Outfit Detection</h4>
                    <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">Private on-device visual analysis</p>
                  </div>
                </div>

                <p className="rounded-xl bg-[#f2f8f2] p-3 text-xs text-[#43483e] dark:bg-[#282b24] dark:text-[#c3c8bb]">
                  Add wardrobe photos from the Wardrobe page when you are ready. Your images stay under your account controls.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Claim Reward & For You Feed Guidance */}
          {currentStep === 5 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/20 border-4 border-white">
                <MaterialIcon icon="emoji_events" size={44} />
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-extrabold rounded-full border border-amber-500/30 inline-block mb-2">
                  {totalXp} XP ACHIEVED
                </span>
                <h3 className="text-2xl font-black font-headline">Welcome to Spresso Commerce!</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-2 max-w-md mx-auto leading-relaxed">
                  We are curating your personalized recommendations, exclusive deals, and trending styles based on your unique fashion profile as we learn more about your tastes.
                </p>
              </div>

              <AnimatedTicketCard
                variant="onboarding"
                title="SPRESSO ONBOARDING PASS"
                subtitle="PERSONALIZED SHOPPING SETUP"
                attendeeName="SPRESSO MEMBER"
                location="Personalized recommendations as you shop"
                date="AVAILABLE AFTER SETUP"
                ticketCode="ONBOARDING-SETUP"
              />
            </motion.div>
          )}

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
