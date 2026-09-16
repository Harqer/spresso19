import { getApp } from "firebase/app";

type LogLevel = "info" | "warn" | "error";

class Logger {
  static async log(level: LogLevel, message: string, context?: any) {
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

    // Google Analytics telemetry
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
