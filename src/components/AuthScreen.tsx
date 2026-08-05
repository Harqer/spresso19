import React, { useState } from "react";
import { SpressoLogo } from "./SpressoLogo";
import { MaterialIcon } from "./MaterialIcon";
import { loginWithGoogle, loginWithEmail, registerWithEmail, loginAnonymously } from "../lib/firebase";

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = "Unable to process authentication request. Please check your details and try again.";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found") {
        msg = "Invalid email or password. Please verify your credentials.";
      } else if (err?.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Try signing in instead.";
      } else if (err?.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters long.";
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      if (user && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.warn("Google Auth note:", err);
      setErrorMsg("Google sign-in popup was blocked by browser frame settings. You can click 'Continue as Guest' below or sign in with email.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginAnonymously();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Guest Auth error:", err);
      setErrorMsg("Unable to start guest session. Please try signing in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fafcf9] flex items-center justify-center p-4 overflow-y-auto">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#d8ebd7]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#386633]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white border border-[#386633]/20 rounded-3xl p-8 shadow-xl">
        {/* Logo & Welcome Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <SpressoLogo variant="full" showTextLeft={true} size="lg" />
          <h2 className="text-xl font-bold text-[#18211e] tracking-tight">
            {mode === "signin" ? "Sign in to access Spresso" : "Create your account"}
          </h2>
          <p className="text-xs text-[#52645b]">
            Your personal AI shopper, wardrobe, & catalog require authentication.
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex bg-[#e8f3e8] p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              mode === "signin"
                ? "bg-white text-[#386633] shadow-xs"
                : "text-[#52645b] hover:text-[#18211e]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
              mode === "register"
                ? "bg-white text-[#386633] shadow-xs"
                : "text-[#52645b] hover:text-[#18211e]"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
            <MaterialIcon icon="error_outline" size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-4 py-2.5 px-4 bg-white border border-[#d8ebd7] hover:bg-[#e8f3e8]/50 text-[#18211e] text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2.5 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-[#d8ebd7]" />
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#52645b] tracking-wider">
            Or with email
          </span>
          <div className="flex-grow border-t border-[#d8ebd7]" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-[#18211e] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Alex Smith"
                className="w-full px-3.5 py-2 bg-[#fafcf9] border border-[#d8ebd7] focus:border-[#386633] focus:outline-none rounded-xl text-xs transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18211e] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2 bg-[#fafcf9] border border-[#d8ebd7] focus:border-[#386633] focus:outline-none rounded-xl text-xs transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18211e] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-[#fafcf9] border border-[#d8ebd7] focus:border-[#386633] focus:outline-none rounded-xl text-xs transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
          >
            {loading ? (
              <MaterialIcon icon="hourglass_empty" size={16} className="animate-spin" />
            ) : (
              <>
                <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                <MaterialIcon icon="arrow_forward" size={16} />
              </>
            )}
          </button>
        </form>

        {/* Guest Session Alternative Option */}
        <div className="mt-6 pt-4 border-t border-[#d8ebd7] text-center">
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={loading}
            className="text-xs text-[#386633] hover:underline font-medium cursor-pointer"
          >
            Continue as Guest (1-Click Instant Access)
          </button>
        </div>
      </div>
    </div>
  );
};
