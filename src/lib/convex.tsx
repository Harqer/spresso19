import React, { useCallback, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { onIdTokenChanged, type User } from "firebase/auth";
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

export type AuthLifecycleState =
  | "initializing"
  | "unauthenticated"
  | "verification_required"
  | "authenticated"
  | "token_refresh_failed";

export function requiresEmailVerification(user: User | null): boolean {
  if (!user) return false;
  const usesPassword = user.providerData.some((provider) => provider.providerId === "password");
  return usesPassword && !user.emailVerified;
}

export function useFirebaseAuthLifecycle(): AuthLifecycleState {
  const [state, setState] = useState<AuthLifecycleState>("initializing");

  useEffect(() => {
    return onIdTokenChanged(auth, (user) => {
      if (!user) {
        setState("unauthenticated");
      } else if (requiresEmailVerification(user)) {
        setState("verification_required");
      } else {
        setState("authenticated");
      }
    });
  }, []);

  return state;
}

function useFirebaseConvexAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    return onIdTokenChanged(auth, (user) => {
      const ready = user !== null && !requiresEmailVerification(user);
      setIsAuthenticated(ready);
      setIsLoading(false);
    });
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    const user = auth.currentUser;
    if (!user || requiresEmailVerification(user)) return null;
    try {
      return await user.getIdToken(forceRefreshToken);
    } catch {
      setIsAuthenticated(false);
      throw new Error("Authentication token refresh failed.");
    }
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
