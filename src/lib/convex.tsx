import React, { useCallback, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function useFirebaseConvexAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setIsAuthenticated(Boolean(user));
    setIsLoading(false);
  }), []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    return auth.currentUser?.getIdToken(forceRefreshToken) ?? null;
  }, []);

  return { isLoading, isAuthenticated, fetchAccessToken };
}

export function SpressoConvexProvider({ children }: { children: React.ReactNode }) {
  const useAuth = useFirebaseConvexAuth;
  if (!convexClient) return <>{children}</>;
  return <ConvexProviderWithAuth client={convexClient} useAuth={useAuth}>{children}</ConvexProviderWithAuth>;
}
