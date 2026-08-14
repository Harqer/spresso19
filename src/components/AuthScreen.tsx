import React, { useState } from "react";
import { SpressoLogo } from "./SpressoLogo";
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  sendPhoneVerificationCode,
  confirmPhoneCode,
  logToCrashlytics
} from "../lib/firebase";
import { MaterialIcon } from "./MaterialIcon";

interface AuthScreenProps {
  onSuccess?: () => void;
  onDevBypass?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onDevBypass }) => {
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"send" | "confirm">("send");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unified Email Auth Handler: Attempts Sign In, automatically creates account if new email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter a valid email address and password.");
      return;
    }

    setLoading(true);
    try {
      try {
        await loginWithEmail(email, password);
      } catch (loginErr: any) {
        // If user doesn't exist yet, automatically create an account
        if (
          loginErr?.code === "auth/user-not-found" ||
          loginErr?.code === "auth/invalid-credential" ||
          (loginErr?.message && loginErr.message.includes("user-not-found"))
        ) {
          const nameFromEmail = email.split("@")[0]
            .replace(/[._\-]+/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          await registerWithEmail(email, password, nameFromEmail);
        } else {
          throw loginErr;
        }
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      logToCrashlytics("error", "Email Auth error", { error: String(err) });
      setErrorMsg(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Phone SMS Handler
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (phoneStep === "send") {
      if (!phoneNumber) {
        setErrorMsg("Please enter a valid phone number with country code.");
        return;
      }
      setLoading(true);
      try {
        const res = await sendPhoneVerificationCode(phoneNumber);
        setConfirmationResult(res);
        setPhoneStep("confirm");
      } catch (err: any) {
        logToCrashlytics("error", "Phone SMS error", { error: String(err) });
        setErrorMsg(err?.message || "Failed to send SMS verification code. Check phone format.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!phoneCode) {
        setErrorMsg("Please enter the 6-digit SMS verification code.");
        return;
      }
      setLoading(true);
      try {
        await confirmPhoneCode(confirmationResult, phoneCode);
        if (onSuccess) onSuccess();
      } catch (err: any) {
        logToCrashlytics("error", "Phone code confirmation error", { error: String(err) });
        setErrorMsg(err?.message || "Invalid verification code.");
      } finally {
        setLoading(false);
      }
    }
  };

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
      {/* Floating Auth Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#141719] rounded-[28px] border border-[#e0e4db] dark:border-[#22272a] shadow-xl p-8 space-y-6 my-auto">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-2xl font-bold font-sans text-[#191d16] dark:text-[#f8fafc] tracking-tight">
            spresso
          </span>
          <SpressoLogo variant="icon" height={28} />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-serif font-semibold text-[#191d16] dark:text-[#f8fafc]">
            Sign In / Sign Up
          </h1>
          <p className="text-xs text-[#52645b] dark:text-[#a0a59a] font-normal leading-relaxed max-w-xs mx-auto">
            Access your AI assistant, custom wardrobe, and live product catalog.
          </p>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div className="p-3 bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 text-[var(--color-accent-orange)] text-xs rounded-2xl text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Container for invisible reCAPTCHA */}
        <div id="recaptcha-container" />

        {/* Development Bypass Button */}
        {import.meta.env.DEV && onDevBypass && (
          <button
            type="button"
            onClick={onDevBypass}
            className="w-full py-3 px-5 mb-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-bold text-xs rounded-full transition-all shadow-sm flex items-center justify-center cursor-pointer active:scale-[0.98]"
          >
            Bypass Login (Dev Mode)
          </button>
        )}

        {/* Reusable Social Auth Action Buttons: Continue with Google & Continue with Phone */}
        <div className="space-y-3">
          {/* Continue with Google */}
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

          {/* Continue with Phone */}
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

        {/* OR Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#e0e4db] dark:border-[#22272a]" />
          <span className="flex-shrink mx-4 text-[10px] font-bold text-[#52645b] dark:text-[#8a9099] uppercase tracking-wider">
            OR WITH EMAIL
          </span>
          <div className="flex-grow border-t border-[#e0e4db] dark:border-[#22272a]" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-[#191d16] dark:text-[#f8fafc]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full py-3 px-4 bg-[#f8faf7] dark:bg-[#101410] border border-[#e0e4db] dark:border-[#253025] focus:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-medium text-xs rounded-2xl outline-none transition placeholder-[#8c948b]"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-[#191d16] dark:text-[#f8fafc]">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-3 px-4 bg-[#f8faf7] dark:bg-[#101410] border border-[#e0e4db] dark:border-[#253025] focus:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-medium text-xs rounded-2xl outline-none transition placeholder-[#8c948b]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 bg-[#386633] hover:bg-[#2d5229] text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <span>{loading ? "Authenticating..." : "Continue with Email"}</span>
              <MaterialIcon icon="arrow_forward" size={16} />
            </button>
          </form>
      </div>

      {/* Phone Auth Modal */}
      {showPhoneModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-[#141719] rounded-[24px] shadow-2xl p-6 border border-[#e0e4db] dark:border-[#22272a] relative">
            <button
              type="button"
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-4 right-4 text-[#8a9099] hover:text-[#191d16] dark:hover:text-white transition-colors"
            >
              <MaterialIcon icon="close" size={20} />
            </button>
            
            <div className="text-center space-y-1 mb-6">
              <h2 className="text-lg font-serif font-bold text-[#191d16] dark:text-[#f8fafc]">
                Continue with Phone
              </h2>
              <p className="text-xs text-[#52645b] dark:text-[#a0a59a]">
                We'll send you a verification code via SMS.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              {phoneStep === "send" ? (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-[#191d16] dark:text-[#f8fafc] flex items-center justify-between">
                    <span>Phone Number</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full py-3 pl-10 pr-4 bg-[#f8faf7] dark:bg-[#101410] border border-[#e0e4db] dark:border-[#253025] focus:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-medium text-xs rounded-2xl outline-none transition placeholder-[#8c948b]"
                    />
                    <MaterialIcon icon="smartphone" size={16} className="absolute left-3.5 text-[#52645b] dark:text-[#8c948b]" />
                  </div>
                  <p className="text-[10px] text-[#52645b] dark:text-[#a0a59a]">Format: +[country_code][number]. Standard SMS rates apply.</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-[#191d16] dark:text-[#f8fafc] flex items-center justify-between">
                    <span>6-Digit Verification Code</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    placeholder="------"
                    className="w-full py-3 px-4 bg-[#f8faf7] dark:bg-[#101410] border border-[#e0e4db] dark:border-[#253025] focus:border-[#386633] text-[#191d16] dark:text-[#f8fafc] font-mono text-center text-base tracking-widest font-bold rounded-2xl outline-none transition placeholder-[#8c948b]"
                  />
                  <button
                    type="button"
                    onClick={() => setPhoneStep("send")}
                    className="text-[10px] text-[#386633] dark:text-[#9cd695] hover:underline block pt-1"
                  >
                    ← Resend SMS Code / Change Phone Number
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-5 bg-[#386633] hover:bg-[#2d5229] text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
              >
                <span>{loading ? "Sending Code..." : phoneStep === "send" ? "Send SMS Code" : "Confirm SMS & Sign In"}</span>
                <MaterialIcon icon="arrow_forward" size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
