import { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { getApp } from "firebase-admin/app";

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    isAnonymous?: boolean;
  };
}

/**
 * Firebase Authentication Middleware
 * Verifies the ID token passed in the Authorization header.
 * Following best practices from the firebase-auth-basics skill.
 */
export const verifyFirebaseToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const isDev = process.env.NODE_ENV !== "production";

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (isDev) {
      req.user = {
        uid: "dev-dummy-user-123",
        email: "dev@localhost",
        isAnonymous: true
      };
      return next();
    }
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing or malformed Authorization header. Please sign in."
    });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // In dev mode, if the token is literal "null", also bypass
    if (isDev && idToken === "null") {
      req.user = {
        uid: "dev-dummy-user-123",
        email: "dev@localhost",
        isAnonymous: true
      };
      return next();
    }

    const decodedToken = await getAuth(getApp()).verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      isAnonymous: decodedToken.provider_id === "anonymous"
    };
    next();
  } catch (error: any) {
    if (isDev) {
      console.warn("[AuthMiddleware] Token verification failed but bypassed for Dev:", error.message);
      req.user = {
        uid: "dev-dummy-user-123",
        email: "dev@localhost",
        isAnonymous: true
      };
      return next();
    }
    console.error("[AuthMiddleware] Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or expired token. Please sign in again."
    });
  }
};
