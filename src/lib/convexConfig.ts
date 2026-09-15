function normalizeConvexUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Convex URL must be a valid HTTPS URL.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Convex URL must be an HTTPS origin without credentials or query parameters.");
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error("Convex URL must not contain a path.");
  }
  if (!parsed.hostname.endsWith(".convex.cloud")) {
    throw new Error("Convex URL must use the Convex cloud domain.");
  }
  return parsed.origin;
}

export function resolveConvexUrl(input: { configuredUrl?: string; isProduction: boolean }): string | undefined {
  const configured = normalizeConvexUrl(input.configuredUrl);
  if (input.isProduction && !configured) {
    throw new Error("Production Convex configuration is missing.");
  }
  return configured;
}
