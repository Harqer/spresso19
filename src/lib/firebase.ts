import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, collection, addDoc, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Enforce browser local persistence for seamless cross-session user state
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Could not enable browser local persistence for Firebase Auth:", err);
});

export const googleProvider = new GoogleAuthProvider();

// Check for redirect result on app initialization
getRedirectResult(auth).then((result) => {
  if (result?.user) {
    console.log("Redirect login successful:", result.user.email);
  }
}).catch((err) => {
  console.warn("Redirect result check notice:", err);
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  logToCrashlytics("error", "Firestore Permission Error: " + errInfo.error, errInfo);
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Firestore Connection Verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Crashlytics & Error Logging Service
export async function logToCrashlytics(
  level: "info" | "warn" | "error" | "fatal",
  message: string,
  extraData?: Record<string, any>
) {
  const logPayload = {
    level,
    message,
    extra: extraData ? JSON.stringify(extraData) : null,
    userId: auth.currentUser?.uid || "anonymous",
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server"
  };

  console.log(`[Crashlytics / Firebase Log] [${level.toUpperCase()}]`, message, extraData || "");

  try {
    await addDoc(collection(db, "logs"), logPayload);
  } catch (err) {
    // Silently handle log dispatch errors
    console.warn("Could not send crash report to Firestore logs:", err);
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

    // Secondary fallback: start guest session if popup is blocked
    const anonUser = await loginAnonymously();
    if (anonUser) return anonUser;

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

export const logoutUser = async () => {
  try {
    await signOut(auth);
    logToCrashlytics("info", "User signed out");
  } catch (error: any) {
    logToCrashlytics("error", `Sign out failed: ${error.message}`);
  }
};
