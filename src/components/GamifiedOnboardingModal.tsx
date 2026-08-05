import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MaterialIcon } from "./MaterialIcon";
import { SpressoLogo } from "./SpressoLogo";

interface GamifiedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (userPreferences: { vibes: string[]; radius: number; locationEnabled: boolean }) => void;
}

const STYLE_VIBES = [
  { id: "streetwear", label: "Streetwear Drops", icon: "checkroom", color: "from-amber-500 to-orange-600" },
  { id: "luxury", label: "Minimalist Luxury", icon: "diamond", color: "from-emerald-600 to-teal-700" },
  { id: "tech", label: "Tech & Gadgets", icon: "devices", color: "from-blue-600 to-indigo-700" },
  { id: "gourmet", label: "Organic Gourmet", icon: "restaurant", color: "from-green-600 to-emerald-800" },
  { id: "vintage", label: "Vintage & Thrift", icon: "history_edu", color: "from-purple-600 to-pink-700" },
];

const SCAN_SAMPLE_ITEM = {
  name: "Spresso Gen-AI Cyber Jacket",
  brand: "Spresso Studio",
  confidence: "99.4%",
  category: "Outerwear",
  price: "$189.00",
  image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop"
};

export const GamifiedOnboardingModal: React.FC<GamifiedOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(["streetwear", "tech"]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [radiusMiles, setRadiusMiles] = useState<number>(25);
  const [locationPermission, setLocationPermission] = useState<boolean>(true);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [floatingXpText, setFloatingXpText] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerXpGain = (amount: number) => {
    setTotalXp((prev) => prev + amount);
    setFloatingXpText(`+${amount} XP!`);
    setTimeout(() => setFloatingXpText(null), 1500);
  };

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

  const handleNextStep1 = () => {
    triggerXpGain(100);
    setCurrentStep(2);
  };

  const handleRunAiScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
      triggerXpGain(150);
    }, 1400);
  };

  const handleNextStep2 = () => {
    setCurrentStep(3);
  };

  const handleNextStep3 = () => {
    triggerXpGain(100);
    setCurrentStep(4);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("spresso_onboarding_completed", "true");
    localStorage.setItem("spresso_user_vibes", JSON.stringify(selectedVibes));
    localStorage.setItem("spresso_search_radius", radiusMiles.toString());
    
    onComplete({
      vibes: selectedVibes,
      radius: radiusMiles,
      locationEnabled: locationPermission
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 overflow-hidden select-none animate-fade-in">
      
      {/* Floating XP Gain Badge Toast */}
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
        
        {/* Onboarding Header with Progress & Level XP */}
        <div className="p-5 bg-white/90 dark:bg-[#191d16]/90 border-b border-[#dfe4d7] dark:border-[#43483e] backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SpressoLogo size="sm" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#446732] dark:text-[#a9d291]">
                  Quest {currentStep} of 4
                </span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30 flex items-center space-x-1">
                  <MaterialIcon icon="stars" size={12} />
                  <span>{totalXp} XP</span>
                </span>
              </div>
              <h2 className="text-sm font-bold truncate">Spresso AI Personal Shopper</h2>
            </div>
          </div>

          <button
            onClick={handleFinishOnboarding}
            className="text-xs font-bold text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-[#dfe4d7] dark:hover:bg-[#43483e] transition cursor-pointer"
          >
            Skip Intro
          </button>
        </div>

        {/* Quest Progress Stepper Line */}
        <div className="w-full bg-[#dfe4d7] dark:bg-[#282b24] h-1.5 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-[#446732] to-[#a9d291] h-full"
            initial={{ width: "25%" }}
            animate={{ width: `${(currentStep / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: Select Style Vibes */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="style" size={32} />
              </div>

              <div>
                <h3 className="text-xl font-black font-headline">What's Your Shopping Vibe?</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Select your favorite categories so Spresso AI can curate live hot drops & deals for you.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
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
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl text-white bg-gradient-to-br ${vibe.color}`}>
                          <MaterialIcon icon={vibe.icon} size={20} />
                        </div>
                        <span className="text-xs font-bold">{vibe.label}</span>
                      </div>

                      <MaterialIcon
                        icon={isSelected ? "check_circle" : "add_circle_outline"}
                        size={20}
                        className={isSelected ? "text-white dark:text-[#191d16]" : "text-[#43483e] dark:text-[#c3c8bb]"}
                      />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Smart Vision Interactive Scanner Mini-Game */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="center_focus_strong" size={32} />
              </div>

              <div>
                <h3 className="text-xl font-black font-headline">Test AI Smart Vision</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Tap "Scan & Match" to test Spresso AI's live visual search and price comparison engine!
                </p>
              </div>

              {/* Simulated Camera Viewfinder */}
              <div className="relative w-full h-52 rounded-2xl overflow-hidden border-2 border-dashed border-[#446732]/40 bg-stone-900 group flex items-center justify-center shadow-lg">
                <img
                  src={SCAN_SAMPLE_ITEM.image}
                  alt="Sample Product"
                  className="w-full h-full object-cover opacity-80"
                />

                {/* Scanning Bounding Box Overlay */}
                <div className="absolute inset-4 border-2 border-[#a9d291] rounded-xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between text-[10px] font-mono text-[#a9d291] bg-black/60 px-2 py-0.5 rounded max-w-max">
                    <span>LIVE_VISION_HUD_V2.4</span>
                  </div>
                  {isScanning && (
                    <motion.div
                      className="w-full h-1 bg-[#a9d291] shadow-[0_0_15px_#a9d291]"
                      animate={{ y: [0, 160, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </div>

                {!scanComplete && !isScanning && (
                  <button
                    onClick={handleRunAiScan}
                    className="absolute z-10 px-5 py-2.5 bg-[#446732] hover:bg-[#385428] text-white font-bold text-xs rounded-full shadow-2xl border border-[#a9d291]/50 cursor-pointer flex items-center space-x-2 animate-pulse"
                  >
                    <MaterialIcon icon="center_focus_strong" size={18} />
                    <span>Tap to Scan Item (+150 XP)</span>
                  </button>
                )}

                {scanComplete && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-x-3 bottom-3 bg-black/85 backdrop-blur-md border border-[#a9d291]/60 p-3 rounded-xl text-left text-white flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1 text-[10px] text-[#a9d291] font-mono font-bold">
                        <MaterialIcon icon="verified" size={12} />
                        <span>MATCH CONFIDENCE {SCAN_SAMPLE_ITEM.confidence}</span>
                      </div>
                      <p className="text-xs font-bold truncate">{SCAN_SAMPLE_ITEM.name}</p>
                      <p className="text-[11px] text-stone-300 font-mono">{SCAN_SAMPLE_ITEM.price} · Best Online Price</p>
                    </div>

                    <span className="px-2.5 py-1 bg-[#a9d291] text-stone-950 font-black text-[10px] rounded-md shrink-0">
                      MATCHED
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Local Discovery Radius Slider */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e8efe0] dark:bg-[#1d2218] text-[#446732] dark:text-[#a9d291] flex items-center justify-center shadow-inner border border-[#a9d291]/30">
                <MaterialIcon icon="my_location" size={32} />
              </div>

              <div>
                <h3 className="text-xl font-black font-headline">Local Deals & Store Radar</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Find physical store inventory, local boutique discounts, and same-day pickup options near you.
                </p>
              </div>

              {/* Animated Radar Pulse Screen */}
              <div className="relative w-full h-44 bg-[#191d16] rounded-2xl overflow-hidden border border-[#dfe4d7] dark:border-[#43483e] flex flex-col items-center justify-center p-4">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 rounded-full border border-[#a9d291]/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full border border-[#a9d291]/40" />
                </div>

                <MaterialIcon icon="storefront" size={32} className="text-[#a9d291] z-10" />
                <span className="text-xs font-mono font-bold text-white mt-2 z-10">
                  Search Radius: <span className="text-[#a9d291] text-sm">{radiusMiles} miles</span>
                </span>

                <div className="w-full max-w-xs mt-4 z-10 px-2">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={radiusMiles}
                    onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                    className="w-full accent-[#446732] dark:accent-[#a9d291] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#c3c8bb] font-mono mt-1">
                    <span>5 mi (Strict)</span>
                    <span>25 mi (City)</span>
                    <span>50 mi (Metro)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white dark:bg-[#191d16] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl text-left">
                <div className="flex items-center space-x-3">
                  <MaterialIcon icon="near_me" size={20} className="text-[#446732] dark:text-[#a9d291]" />
                  <div>
                    <p className="text-xs font-bold">Enable Location Permissions</p>
                    <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">Provides real-time local stock alerts</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={locationPermission}
                  onChange={(e) => setLocationPermission(e.target.checked)}
                  className="w-5 h-5 accent-[#446732] dark:accent-[#a9d291] cursor-pointer"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 4: Claim Reward & Complete */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-yellow-500 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/20 border-4 border-white">
                <MaterialIcon icon="emoji_events" size={44} />
              </div>

              <div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-extrabold rounded-full border border-amber-500/30 inline-block mb-2">
                  500 XP ACHIEVED · LEVEL 1 UNLOCKED
                </span>
                <h3 className="text-2xl font-black font-headline">Welcome to Spresso AI!</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-1 max-w-sm mx-auto">
                  Your personalized shopper profile is configured and ready. Here is your exclusive welcome perk!
                </p>
              </div>

              {/* VIP Reward Coupon Card */}
              <div className="p-4 bg-gradient-to-br from-[#191d16] to-[#282b24] text-white rounded-2xl border border-[#a9d291]/50 shadow-lg text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#a9d291] uppercase tracking-wider">
                    SPRESSO VIP WELCOME PASS
                  </span>
                  <span className="px-2 py-0.5 bg-[#a9d291] text-stone-950 text-[10px] font-black rounded">
                    10% OFF
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <p className="text-base font-extrabold font-headline">Code: SPRESSO10</p>
                    <p className="text-[11px] text-stone-300">Valid on any Spresso Verified Merchant item</p>
                  </div>
                  <MaterialIcon icon="confirmation_number" size={28} className="text-[#a9d291]" />
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 bg-white/95 dark:bg-[#191d16]/95 border-t border-[#dfe4d7] dark:border-[#43483e] flex items-center justify-between space-x-3">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-3 rounded-xl border border-[#dfe4d7] dark:border-[#43483e] text-xs font-bold text-[#43483e] dark:text-[#c3c8bb] hover:bg-[#dfe4d7] dark:hover:bg-[#43483e] transition cursor-pointer flex items-center space-x-1"
            >
              <MaterialIcon icon="arrow_back" size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <button
              onClick={
                currentStep === 1
                  ? handleNextStep1
                  : currentStep === 2
                  ? handleNextStep2
                  : handleNextStep3
              }
              className="px-6 py-3 bg-[#446732] hover:bg-[#385428] dark:bg-[#a9d291] dark:hover:bg-[#96c47c] text-white dark:text-[#191d16] font-extrabold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center space-x-2"
            >
              <span>{currentStep === 2 && !scanComplete ? "Skip Mini-Game" : "Continue"}</span>
              <MaterialIcon icon="arrow_forward" size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinishOnboarding}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Explore Spresso Shopper</span>
              <MaterialIcon icon="rocket_launch" size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
