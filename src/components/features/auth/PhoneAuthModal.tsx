import React, { useState } from "react";
import { sendPhoneVerificationCode, confirmPhoneCode, logToCrashlytics } from "../../../../lib/firebase";
import { MaterialIcon } from "../../../MaterialIcon";

interface PhoneAuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({ onClose, onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<"send" | "confirm">("send");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#141719] rounded-[24px] shadow-2xl p-6 border border-[#e0e4db] dark:border-[#22272a] relative">
        <button
          type="button"
          onClick={onClose}
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

        {errorMsg && (
          <div className="mb-4 p-3 bg-[var(--color-accent-orange)]/10 border border-[var(--color-accent-orange)]/30 text-[var(--color-accent-orange)] text-xs rounded-2xl text-center font-medium">
            {errorMsg}
          </div>
        )}

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
  );
};
