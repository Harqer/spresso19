import { describe, expect, test } from "vitest";
import { createMediaKey, validateGeneratedMedia } from "./boundary";
import { bunnyConfigFromEnv, BunnyMediaStore } from "./bunnyStore";

describe("generated media boundary", () => {
  test("creates deterministic owner-scoped content-addressed keys", async () => {
    const bytes = new TextEncoder().encode("image");
    const first = await createMediaKey("user-a", bytes, "image/png");
    const second = await createMediaKey("user-a", bytes, "image/png");
    expect(first).toEqual(second);
    expect(first.mediaKey).toMatch(/^private\/users\/user-a\/generated\/[a-f0-9]{64}\.png$/);
  });

  test("rejects unsupported and oversized media", () => {
    expect(() => validateGeneratedMedia(new Uint8Array([1]), "application/octet-stream")).toThrow();
    expect(() => validateGeneratedMedia(new Uint8Array(25 * 1024 * 1024 + 1), "image/png")).toThrow();
  });

  test("requires HTTPS Bunny CDN configuration and server-only secrets", () => {
    expect(() => bunnyConfigFromEnv({})).toThrow(/BUNNY_CDN_BASE_URL/);
  expect(() => bunnyConfigFromEnv({ BUNNY_CDN_BASE_URL: "http://cdn.example" })).toThrow(/HTTPS/);
  expect(() => bunnyConfigFromEnv({ BUNNY_CDN_BASE_URL: "https://cdn.example" })).toThrow(/BUNNY_STORAGE_HOST/);
  expect(() => bunnyConfigFromEnv({
    BUNNY_STORAGE_HOST: "http://storage.example",
    BUNNY_STORAGE_ZONE: "zone",
    BUNNY_STORAGE_ACCESS_KEY: "access-key",
    BUNNY_CDN_BASE_URL: "https://cdn.example",
    BUNNY_CDN_TOKEN_KEY: "token-key",
  })).toThrow(/BUNNY_STORAGE_HOST.*HTTPS/);
});

  test("creates Bunny advanced-auth URLs with bounded expiry", async () => {
    const store = new BunnyMediaStore(bunnyConfigFromEnv({
      BUNNY_STORAGE_HOST: "https://storage.bunnycdn.com",
      BUNNY_STORAGE_ZONE: "spresso-dev",
      BUNNY_STORAGE_ACCESS_KEY: "server-only",
      BUNNY_CDN_BASE_URL: "https://spresso-dev.b-cdn.net",
      BUNNY_CDN_TOKEN_KEY: "cdn-secret",
    }));
    const url = await store.createReadUrl("user-a", "private/users/user-a/generated/abc.png", 3600);
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://spresso-dev.b-cdn.net");
    expect(parsed.searchParams.get("token")).toMatch(/^HS256-[A-Za-z0-9_-]+$/);
    expect(Number(parsed.searchParams.get("expires"))).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 15 * 60);
  });
});
