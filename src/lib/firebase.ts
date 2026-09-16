import Logger from "./Logger";
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getToken as getAppCheckToken, initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import type { Analytics } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase is the identity provider only. Application state lives in Convex;
// media bytes live in Bunny. Firestore, Realtime Database, Storage, Cloud
// Functions, and Data Connect are retired from this app.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// App Check protects the authenticated Convex AI endpoints. The production
// reCAPTCHA key is supplied at build time; leaving it unset keeps local
// development usable while making the missing production configuration
// explicit in deployment checks.
export let appCheck: AppCheck | null = null;
if (typeof window !== "undefined") {
  const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

// Google Analytics receives error/app telemetry from Logger.
let analytics: Analytics | null = null;

if (typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
}

export { analytics };

// Enforce browser local persistence for seamless cross-session user state
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("[auth] Could not enable browser local persistence:", err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Check for redirect result on app initialization
getRedirectResult(auth).then((_result) => {
  // Redirect result handled silently; auth state observer in the app will pick up the new user
}).catch((_err) => {
  // Non-fatal — user may simply not have come from a redirect flow
});

/** Console crash-breadcrumb sink. Errors also reach Google Analytics via Logger. */
export async function logToCrashlytics(
  level: "info" | "warn" | "error" | "fatal",
  message: string,
  extraData?: Record<string, any>
) {
  const rendered = extraData ? `${message} ${JSON.stringify(extraData)}`.slice(0, 2000) : message.slice(0, 2000);
  if (level === "error" || level === "fatal") console.error(`[${level}]`, rendered);
  else console.warn(`[${level}]`, rendered);
}

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    logToCrashlytics("info", `Anonymous user signed in: ${result.user.uid}`);
    return result.user;
  } catch (error: any) {
    logToCrashlytics("warn", `Anonymous sign in attempt note: ${error.message}`);
    return null;
  }
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    logToCrashlytics("info", `User signed in: ${result.user.email}`);
    return result.user;
  } catch (error: any) {
    logToCrashlytics("warn", `Google popup sign-in notice: ${error?.message || error}`);

    // If popup was blocked by browser iframe context, attempt redirect or fallback
    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request" ||
      (error?.message && error.message.includes("popup"))
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirectErr: any) {
        logToCrashlytics("warn", `Google redirect sign-in note: ${redirectErr.message}`);
      }
    }

    // Removing silent anonymous fallback. 
    // Throw error to UI so the user knows Google Auth was blocked.

    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    logToCrashlytics("info", `User signed in with email: ${result.user.email}`);
    return result.user;
  } catch (error: any) {
    logToCrashlytics("error", `Email Auth failed: ${error.message}`);
    throw error;
  }
};

export const registerWithEmail = async (email: string, pass: string, name?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    logToCrashlytics("info", `User registered with email: ${result.user.email}`);
    return result.user;
  } catch (error: any) {
    logToCrashlytics("error", `Registration failed: ${error.message}`);
    throw error;
  }
};

export const sendPhoneVerificationCode = async (phoneNumber: string, containerId: string = 'recaptcha-container') => {
  try {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          logToCrashlytics("info", "reCAPTCHA verified for Phone Auth");
        }
      });
    }
    const appVerifier = (window as any).recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    logToCrashlytics("info", `SMS code sent to: ${phoneNumber}`);
    return confirmationResult;
  } catch (error: any) {
    logToCrashlytics("error", `Phone verification code send failed: ${error.message}`);
    throw error;
  }
};

export const confirmPhoneCode = async (confirmationResult: any, code: string) => {
  try {
    const result = await confirmationResult.confirm(code);
    logToCrashlytics("info", `Phone user authenticated: ${result.user.phoneNumber}`);
    return result.user;
  } catch (error: any) {
    logToCrashlytics("error", `Phone code confirmation failed: ${error.message}`);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    logToCrashlytics("info", "User signed out");
  } catch (error: any) {
    logToCrashlytics("error", `Sign out failed: ${error.message}`);
  }
};

/**
 * Helper to get the current user's ID token for authenticated API requests.
 */
export const getAuthToken = async (): Promise<string | null> => {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken();
  } catch (err) {
    Logger.error("Failed to get auth token", err);
    return null;
  }
};

/**
 * Authenticated Fetch Wrapper
 * Automatically injects the Firebase ID token into the Authorization header.
 */
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (appCheck) {
    const appCheckToken = await getAppCheckToken(appCheck);
    headers.set("X-Firebase-AppCheck", appCheckToken.token);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    logToCrashlytics("fatal", "Uncaught Browser Exception", {
      error: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    logToCrashlytics("fatal", "Unhandled Promise Rejection (Browser)", {
      reason: String(event.reason),
      stack: event.reason instanceof Error ? event.reason.stack : undefined
    });
  });
}
