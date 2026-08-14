import React from "react";
import { motion } from "framer-motion";
import { FluidShaderCanvas } from "@/src/components/shared/FluidShaderCanvas";
import { MaterialIcon } from "../../MaterialIcon";

export type TicketVariant = "startup_school" | "google_pay" | "coinbase_usdc" | "onboarding";

export interface AnimatedTicketCardProps {
  variant?: TicketVariant;
  title?: string;
  subtitle?: string;
  attendeeName?: string;
  location?: string;
  date?: string;
  ticketCode?: string;
  onSaveToWallet?: () => void;
}

const PALETTES: Record<TicketVariant, [string, string, string, string]> = {
  startup_school: ["#ff5e1a", "#f59e0b", "#d97706", "#78350f"], // Warm Orange/Amber (Screenshot Match)
  google_pay: ["#34a853", "#fbbc04", "#ea4335", "#4285f4"],    // 4-Color Google Pay
  coinbase_usdc: ["#0052ff", "#38bdf8", "#1d4ed8", "#60a5fa"],   // Coinbase / Base Electric Blue
  onboarding: ["#8b5cf6", "#ec4899", "#6366f1", "#d946ef"],      // Onboarding Magenta / Violet
};

export const AnimatedTicketCard: React.FC<AnimatedTicketCardProps> = ({
  variant = "startup_school",
  title = "STARTUP SCHOOL 2026",
  subtitle = "YOU'RE CONFIRMED",
  attendeeName = "SARAH CHEN",
  location = "CHASE CENTER, SF",
  date = "JULY 25-26 2026",
  ticketCode = "Y-COMB-84920",
  onSaveToWallet
}) => {
  const colors = PALETTES[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, rotate: 0.5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative w-full max-w-xl mx-auto p-2"
    >
      {/* Outer Ticket Shell with Circular Notch Cutouts */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/25 text-white flex flex-col md:flex-row min-h-[220px]">
        {/* Animated Fluid Shader Background Canvas */}
        <div className="absolute inset-0 z-0">
          <FluidShaderCanvas colors={colors} speed={1.2} interactive={true} />
          {/* Subtle noise/texture overlay */}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none" />
        </div>

        {/* Left Side Notch */}
        <div className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full bg-[#18211e] z-20 border-r border-white/25 hidden md:block" />

        {/* Main Ticket Content (Left Panel) */}
        <div className="relative z-10 flex-1 p-6 md:p-7 flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/90 block font-mono">
              {title}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 block font-mono">
              {subtitle}
            </span>
          </div>

          {/* Attendee Name */}
          <div className="py-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-white font-mono drop-shadow-md">
              {attendeeName}
            </h2>
            <p className="text-[11px] font-bold text-white/80 uppercase font-mono tracking-wider">
              FROM: SAN FRANCISCO, CA
            </p>
          </div>

          {/* Location & Date */}
          <div className="flex items-center justify-between pt-2 border-t border-white/25 text-[11px] font-extrabold text-white/90 font-mono tracking-wider">
            <span>{location}</span>
            <span>•</span>
            <span>{date}</span>
          </div>
        </div>

        {/* Dashed Separator Line */}
        <div className="relative z-10 hidden md:flex items-center justify-center">
          <div className="h-full border-r-2 border-dashed border-white/40 my-4" />
        </div>

        {/* Right Stub Panel ("ADMIT ONE" Vertical Text) */}
        <div className="relative z-10 p-5 md:w-36 bg-black/25 backdrop-blur-sm flex flex-col items-center justify-between border-t md:border-t-0 md:border-l border-white/25">
          <div className="flex items-center justify-center h-full my-auto py-2">
            <span className="text-xl md:text-2xl font-black uppercase tracking-widest text-white/90 font-mono md:[writing-mode:vertical-lr] md:rotate-180 drop-shadow-sm select-none">
              ADMIT ONE
            </span>
          </div>

          {/* Dynamic QR Barcode */}
          <div className="mt-3 p-2 bg-white/90 rounded-xl text-stone-900 shadow-md flex items-center justify-center space-x-1 font-mono text-[9px] font-bold">
            <MaterialIcon icon="qr_code_2" size={24} className="text-stone-900" />
            <span className="truncate">{ticketCode.substring(0, 8)}</span>
          </div>
        </div>

        {/* Right Side Notch */}
        <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 rounded-full bg-[#18211e] z-20 border-l border-white/25 hidden md:block" />
      </div>

      {/* Save Button */}
      {onSaveToWallet && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onSaveToWallet}
            className="px-5 py-2.5 bg-[#18211e] hover:bg-[#222924] text-white border border-[#3d4a40] rounded-full text-xs font-bold font-mono transition cursor-pointer flex items-center space-x-2 shadow-lg hover:scale-105"
          >
            <MaterialIcon icon="download" size={16} />
            <span>SAVE PASS TO WALLET</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
