import React, { useCallback, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import { resolveConvexUrl } from "./convexConfig";
import { api } from "../../convex/_generated/api";
import type { DiscoveryCallable } from "./discoveryRepository";
import { DiscoveryRepository } from "./discoveryRepository";

const convexUrl = resolveConvexUrl({
  configuredUrl: import.meta.env.VITE_CONVEX_URL,
  isProduction: import.meta.env.PROD,
});

export const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** Create the external-provider discovery repository backed by Convex actions. */
export function createConvexDiscoveryRepository(): DiscoveryRepository | null {
  if (!convexClient) return null;
  const discover: DiscoveryCallable = async (request, signal) => {
    if (signal.aborted) throw new DOMException("Discovery request was cancelled.", "AbortError");
    const query = request.searchQueries.join(" ").trim();
    if (!query) throw new Error("A discovery query is required.");
    return convexClient.action(api.discovery.search, { query });
  };
  return new DiscoveryRepository({ discover });
}

function useFirebaseConvexAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(user !== null);
      setIsLoading(false);
    });
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken(forceRefreshToken);
  }, []);

  return { isLoading, isAuthenticated, fetchAccessToken };
}

export function SpressoConvexProvider({ children }: { children: React.ReactNode }) {
  if (!convexClient) return <>{children}</>;
  return (
    <ConvexProviderWithAuth client={convexClient} useAuth={useFirebaseConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
