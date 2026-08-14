import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MaterialIcon } from "./MaterialIcon";
import { SpressoLogo } from "./SpressoLogo";
import { AnimatedTicketCard } from "@/src/components/features/orders/AnimatedTicketCard";

interface GamifiedOnboardingModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onComplete?: (userPreferences: { vibes: string[]; radius: number; locationEnabled: boolean }) => void;
  onAskAI?: (query: string, image?: string) => void;
  onSelectTryOn?: (product: any) => void;
}

const STYLE_VIBES = [
  { id: "gourmet", label: "Organic Gourmet", icon: "restaurant", color: "from-green-600 to-emerald-800" },
  { id: "streetwear", label: "Streetwear Drops", icon: "checkroom", color: "from-amber-500 to-orange-600" },
  { id: "luxury", label: "Minimalist Luxury", icon: "diamond", color: "from-teal-600 to-cyan-700" },
  { id: "tech", label: "Wearables & Tech", icon: "smart_toy", color: "from-blue-600 to-indigo-700" },
];

export const GamifiedOnboardingModal: React.FC<GamifiedOnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  onSelectTryOn
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedVibes, setSelectedVibes] = useState<string[]>(["streetwear", "luxury"]);
  const [tryOnTested, setTryOnTested] = useState<boolean>(false);
  const [cardAdded, setCardAdded] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>("");
  const [wardrobeConnected, setWardrobeConnected] = useState<boolean>(false);
  const [totalXp, setTotalXp] = useState<number>(0);
  const [floatingXpText, setFloatingXpText] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerXpGain = (amount: number) => {
    setTotalXp((prev) => prev + amount);
    setFloatingXpText(`+${amount} XP!`);
    setTimeout(() => setFloatingXpText(null), 1800);
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

  const handleTestTryOn = () => {
    setTryOnTested(true);
    triggerXpGain(150);
    if (onSelectTryOn) {
      onSelectTryOn({
        id: "prod-onboard-01",
        name: "Spresso VIP Virtual Try-On Jacket",
        brand: "Spresso Studio",
        category: "Outerwear",
        price: 199.00,
        image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80"
      });
    }
  };

  const handleSaveCard = () => {
    setCardAdded(true);
    triggerXpGain(150);
  };

  const handleConnectWardrobe = () => {
    setWardrobeConnected(true);
    triggerXpGain(150);
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem("spresso_onboarding_completed", "true");
    localStorage.setItem("spresso_user_vibes", JSON.stringify(selectedVibes));
    localStorage.setItem("spresso_card_saved", cardAdded ? "true" : "false");
    localStorage.setItem("spresso_wardrobe_synced", wardrobeConnected ? "true" : "false");
    
    onComplete?.({
      vibes: selectedVibes,
      radius: 25,
      locationEnabled: true
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
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/30 flex items-center space-x-1">
                  <MaterialIcon icon="stars" size={12} />
                  <span>{totalXp} XP</span>
                </span>
              </div>
              <h2 className="text-sm font-bold truncate">Spresso Commerce Onboarding</h2>
            </div>
          </div>

          <button
            onClick={handleFinishOnboarding}
            className="text-xs font-bold text-[#43483e] dark:text-[#c3c8bb] hover:text-[#191d16] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-[#dfe4d7] dark:hover:bg-[#43483e] transition cursor-pointer"
          >
            Skip Intro
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
                        <div className={`p-2 rounded-xl text-white bg-gradient-to-br ${vibe.color}`}>
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
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-900 shrink-0">
                    <img src="https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80" alt="Jacket" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">Spresso VIP Virtual Try-On Jacket</h4>
                    <p className="text-[11px] text-[#43483e] dark:text-[#c3c8bb]">3D Spatial Mesh & AR Overlay Supported</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestTryOn}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    tryOnTested
                      ? "bg-green-700 text-white shadow-xs"
                      : "bg-[#446732] hover:bg-[#385428] text-white shadow-md"
                  }`}
                >
                  <MaterialIcon icon={tryOnTested ? "task_alt" : "view_in_ar"} size={18} />
                  <span>{tryOnTested ? "Virtual Try-On Verified (+150 XP)" : "Launch Virtual Try-On Studio"}</span>
                </button>
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
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#43483e] dark:text-[#c3c8bb]">Card Number (Stripe Tokenized)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="4242 •••• •••• 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#f8faf6] dark:bg-[#282b24] border border-[#dfe4d7] dark:border-[#43483e] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#446732]"
                    />
                    <MaterialIcon icon="payment" size={18} className="absolute left-3 top-3 text-[#43483e] dark:text-[#c3c8bb]" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCard}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    cardAdded
                      ? "bg-green-700 text-white shadow-xs"
                      : "bg-[#446732] hover:bg-[#385428] text-white shadow-md"
                  }`}
                >
                  <MaterialIcon icon={cardAdded ? "verified" : "lock"} size={18} />
                  <span>{cardAdded ? "Payment Method Saved (+150 XP)" : "Save Card & Google Wallet"}</span>
                </button>
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

                <button
                  type="button"
                  onClick={handleConnectWardrobe}
                  className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
                    wardrobeConnected
                      ? "bg-green-700 text-white shadow-xs"
                      : "bg-[#446732] hover:bg-[#385428] text-white shadow-md"
                  }`}
                >
                  <MaterialIcon icon={wardrobeConnected ? "check_circle" : "add_photo_alternate"} size={18} />
                  <span>{wardrobeConnected ? "Photo Gallery Linked (+150 XP)" : "Connect Photo Gallery & Wardrobe"}</span>
                </button>
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
                  {totalXp} XP ACHIEVED · SPRESSO VIP UNLOCKED
                </span>
                <h3 className="text-2xl font-black font-headline">Welcome to Spresso Commerce!</h3>
                <p className="text-xs text-[#43483e] dark:text-[#c3c8bb] mt-2 max-w-md mx-auto leading-relaxed">
                  We are curating your personalized recommendations, exclusive deals, and trending styles based on your unique fashion profile as we learn more about your tastes.
                </p>
              </div>

              <AnimatedTicketCard
                variant="onboarding"
                title="SPRESSO VIP ONBOARDING PASS"
                subtitle="WELCOME MEMBER PERK"
                attendeeName="SPRESSO MEMBER"
                location="10% OFF PROMO CODE: SPRESSO10"
                date="VALID LIFETIME"
                ticketCode="VIP-ONBOARD-2026"
              />
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

          {currentStep < 5 ? (
            <button
              onClick={() => {
                triggerXpGain(100);
                setCurrentStep((prev) => prev + 1);
              }}
              className="px-6 py-3 bg-[#446732] hover:bg-[#385428] dark:bg-[#a9d291] dark:hover:bg-[#96c47c] text-white dark:text-[#191d16] font-extrabold text-xs rounded-xl transition shadow-md cursor-pointer flex items-center space-x-2"
            >
              <span>Continue</span>
              <MaterialIcon icon="arrow_forward" size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinishOnboarding}
              className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>Explore Spresso Commerce</span>
              <MaterialIcon icon="rocket_launch" size={18} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
