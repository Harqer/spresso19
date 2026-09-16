import { resolveConvexUrl } from "../../src/lib/convexConfig";

describe("resolveConvexUrl", () => {
  it("requires a configured URL in production", () => {
    expect(() =>
      resolveConvexUrl({ configuredUrl: undefined, isProduction: true }),
    ).toThrow(
      /production builds require VITE_CONVEX_URL/i,
    );
  });

  it("rejects empty production URLs", () => {
    expect(() =>
      resolveConvexUrl({ configuredUrl: "", isProduction: true }),
    ).toThrow(/production builds require VITE_CONVEX_URL/i);
  });

  it("accepts the configured URL in production", () => {
    const url = "https://example-user.vercel.app";
    expect(resolveConvexUrl({ configuredUrl: url, isProduction: true })).toBe(
      url,
    );
  });

  it("keeps development usable without a configured URL", () => {
    const result = resolveConvexUrl({ configuredUrl: undefined, isProduction: false });
    expect(result).toBeUndefined();
  });

  it("uses the configured URL in development when provided", () => {
    const url = "https://dev.example.com";
    expect(resolveConvexUrl({ configuredUrl: url, isProduction: false })).toBe(
      url,
    );
  });
});
