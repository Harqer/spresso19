import React, { useState } from "react";
import { loginWithEmail, registerWithEmail, logToCrashlytics } from "../../../../lib/firebase";
import { MaterialIcon } from "../../../MaterialIcon";

interface EmailAuthFormProps {
  onSuccess?: () => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setErrorMsg: (msg: string | null) => void;
}

export const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ onSuccess, loading, setLoading, setErrorMsg }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  return (
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
        <span>{loading ? "Signing In..." : "Continue with Email"}</span>
        <MaterialIcon icon="arrow_forward" size={16} />
      </button>
    </form>
  );
};
