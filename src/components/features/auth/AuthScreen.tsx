import React, { useState } from "react";
import { SpressoLogo } from "../../../components/SpressoLogo";
import { loginWithGoogle, logToCrashlytics } from "../../../../lib/firebase";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { EmailAuthForm } from "./EmailAuthForm";
import { PhoneAuthModal } from "./PhoneAuthModal";

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user && onSuccess) onSuccess();
    } catch (err: any) {
      logToCrashlytics("warn", "Google Auth note", { error: String(err) });
      setErrorMsg("Couldn't sign you in. Try allowing pop-ups.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fafcf9] dark:bg-[#090a0c] text-[#191d16] dark:text-[#f8fafc] flex flex-col items-center justify-center p-4 select-none overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-[#141719] rounded-[28px] border border-[#e0e4db] dark:border-[#22272a] shadow-xl p-8 space-y-6 my-auto">
        
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl font-bold font-sans text-[#191d16] dark:text-[#f8fafc] tracking-tight">
            spresso
          </span>
          <SpressoLogo variant="icon" height={28} />
        </div>

        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#191d16] dark:text-[#f8fafc]">
            Sign In / Sign Up
          </h1>
          <p className="text-xs text-[#52645b] dark:text-[#a0a59a] font-normal leading-relaxed max-w-xs mx-auto">
            Access your AI assistant, custom wardrobe, and live product catalog.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 text-[var(--color-accent-orange)] text-xs rounded-2xl text-center font-medium">
            {errorMsg}
          </div>
        )}

        <div id="recaptcha-container" />

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-5 bg-white dark:bg-[#181c18] border border-[#d8ebd7] dark:border-[#283228] hover:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-bold text-xs rounded-full transition-all flex items-center justify-center space-x-3 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowPhoneModal(true);
              setErrorMsg(null);
            }}
            disabled={loading}
            className="w-full py-3 px-5 bg-white dark:bg-[#181c18] border border-[#d8ebd7] dark:border-[#283228] hover:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-bold text-xs rounded-full transition-all flex items-center justify-center space-x-3 shadow-2xs cursor-pointer active:scale-[0.98]"
          >
            <MaterialIcon icon="phone" size={16} className="text-[#386633] dark:text-[#9cd695]" />
            <span>Continue with Phone</span>
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#e0e4db] dark:border-[#22272a]" />
          <span className="flex-shrink mx-4 text-[10px] font-bold text-[#52645b] dark:text-[#8a9099] uppercase tracking-wider">
            OR WITH EMAIL
          </span>
          <div className="flex-grow border-t border-[#e0e4db] dark:border-[#22272a]" />
        </div>

        <EmailAuthForm 
          onSuccess={onSuccess} 
          loading={loading} 
          setLoading={setLoading} 
          setErrorMsg={setErrorMsg} 
        />
      </div>

      {showPhoneModal && (
        <PhoneAuthModal 
          onClose={() => setShowPhoneModal(false)} 
          onSuccess={onSuccess} 
        />
      )}
    </div>
  );
};
