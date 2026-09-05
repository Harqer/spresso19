import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: unknown;
  timestamp?: unknown;
}

function toFirestoreContext(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (value == null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return String(value);
  if (depth >= 5) return "[Truncated]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error || ("name" in value && "message" in value)) {
    const error = value as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof error.name === "string" ? error.name : "Error",
      message: typeof error.message === "string" ? error.message : String(error.message),
      ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
    };
  }
  if (Array.isArray(value)) return value.map((entry) => toFirestoreContext(entry, seen, depth + 1));

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toFirestoreContext(entry, seen, depth + 1)]));
}

class Logger {
  static async log(level: LogLevel, message: string, context?: any) {
    // 1. Console Logging
    const timestamp = new Date().toISOString();
    const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case "info":
        console.log(logPrefix, message, context || "");
        break;
      case "warn":
        console.warn(logPrefix, message, context || "");
        break;
      case "error":
        console.error(logPrefix, message, context || "");
        break;
    }

    // 2. Structured Telemetry (Firestore Breadcrumbs)
    try {
      if (getAuth(getApp()).currentUser) {
        const safeContext = toFirestoreContext(context);
        const logPayload: LogPayload = {
          level,
          message,
          context: safeContext,
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db, "logs"), logPayload);
      }
    } catch (e) {
      console.error("Failed to send log telemetry to Firestore:", e);
    }

    // 3. Google Analytics / Performance telemetry
    if (typeof window !== "undefined") {
      import("firebase/analytics").then(({ getAnalytics, logEvent }) => {
        const app = getApp(); // Requires getApp from firebase/app
        const analytics = getAnalytics(app);
        if (analytics) {
          if (level === "error") {
            logEvent(analytics, "exception", {
              description: message,
              fatal: true,
              ...(context && typeof context === "object" && !Array.isArray(context) ? context : { context })
            });
          } else {
            logEvent(analytics, "app_log", {
              log_level: level,
              description: message,
              ...(context && typeof context === "object" && !Array.isArray(context) ? context : { context })
            });
          }
        }
      }).catch(() => { /* silent fail if analytics isn't available */});
    }
  }

  static info(message: string, context?: any) {
    this.log("info", message, context);
  }

  static warn(message: string, context?: any) {
    this.log("warn", message, context);
  }

  static error(message: string, context?: any) {
    this.log("error", message, context);
  }
}

export default Logger;
