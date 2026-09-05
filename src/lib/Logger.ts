import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getApp } from "firebase/app";

type LogLevel = "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  context?: any;
  timestamp?: any;
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
      const logPayload: LogPayload = {
        level,
        message,
        context,
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, "logs"), logPayload);
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
              ...context
            });
          } else {
            logEvent(analytics, "app_log", {
              log_level: level,
              description: message,
              ...context
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
