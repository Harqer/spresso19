import Logger from "./Logger";
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, PhoneAuthCredential } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDocFromServer, serverTimestamp } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import { getToken as getAppCheckToken, initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import type { Analytics } from 'firebase/analytics';
import type { FirebasePerformance } from 'firebase/performance';
import { getDataConnect, connectDataConnectEmulator } from 'firebase/data-connect';
import { connectorConfig } from '../dataconnect';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const rtdb = getDatabase(app, "https://get-spresso-default-rtdb.firebaseio.com");
export const auth = getAuth(app);
export const dataConnect = getDataConnect(app, connectorConfig);
export const functions = getFunctions(app);

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

// Initialize Telemetry: Firebase Performance Monitoring & Google Analytics
let analytics: Analytics | null = null;
let perf: FirebasePerformance | null = null;

if (typeof window !== "undefined") {
  // We only initialize Analytics and Performance in browser environments
  import("firebase/analytics").then(({ getAnalytics }) => {
    analytics = getAnalytics(app);
  });
  import("firebase/performance").then(({ getPerformance }) => {
    perf = getPerformance(app);
  });
}

export { analytics, perf };

// Enforce browser local persistence for seamless cross-session user state
setPersistence(auth, browserLocalPersistence).catch((err) => {
  logToCrashlytics("warn", "Could not enable browser local persistence", { error: String(err) });
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  logToCrashlytics("error", "Firestore Permission Error: " + errInfo.error, errInfo);
  throw new Error(JSON.stringify(errInfo));
}

// Crashlytics & Error Logging Service
export async function logToCrashlytics(
  level: "info" | "warn" | "error" | "fatal",
  message: string,
  extraData?: Record<string, any>
) {
  const logPayload = {
    level,
    message: extraData ? `${message} ${JSON.stringify(extraData)}`.slice(0, 2000) : message.slice(0, 2000),
    timestamp: serverTimestamp(),
  };

  // Write to Firestore logs collection (acts as the Crashlytics sink for the web platform)

  try {
    await addDoc(collection(db, "logs"), logPayload);
  } catch (_err) {
    // Silently handle log dispatch errors to avoid infinite recursion
  }
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
 * Following best practices from the firebase-auth-basics skill.
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
 * Following best practices from the firebase-auth-basics skill.
 */
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (appCheck) {
    const tokenResult = await getAppCheckToken(appCheck);
    headers.set("X-Firebase-AppCheck", tokenResult.token);
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
