import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-vision-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-vision-owner",
};
const other = {
  ...owner,
  subject: "firebase-vision-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-vision-other",
};

const mediaKeyFor = (uid: string) => `private/users/${uid}/generated/${"a".repeat(64)}.jpg`;

async function seedAsset(t: ReturnType<typeof convexTest>, tokenIdentifier: string, mediaKey: string) {
  return t.mutation(internal.media.recordAsset, {
    tokenIdentifier,
    mediaKey,
    mimeType: "image/jpeg",
    byteLength: 1024,
    sha256: "a".repeat(64),
  });
}

function apifyPayload() {
  return [
    {
      productUrl: "https://merchant.example/jacket",
      id: "apify-1",
      name: "Denim Jacket",
      brand: "Example Brand",
      imageUrl: "https://cdn.merchant.example/jacket.jpg",
      price: "89.99",
      currency: "usd",
      rating: 4.5,
      reviewCount: 12,
    },
    { title: "Broken row without a URL" },
  ];
}

// convex-test resolves deployment env vars from the test process environment.
function configureTestEnv() {
  process.env.APIFY_API_TOKEN = "apify-token";
  process.env.BUNNY_STORAGE_HOST = "https://storage.bunnycdn.com";
  process.env.BUNNY_STORAGE_ZONE = "test-zone";
  process.env.BUNNY_STORAGE_ACCESS_KEY = "storage-key";
  process.env.BUNNY_CDN_BASE_URL = "https://test-zone.b-cdn.net";
  process.env.BUNNY_CDN_TOKEN_KEY = "cdn-token";
}

/** Serves the Bunny byte-read, then the provider request, from one fetch mock. */
function fetchServing(bunnyBytes: Uint8Array, providerStatus: number, providerBody: unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("storage.bunnycdn.com")) {
      return new Response(bunnyBytes.buffer as ArrayBuffer, { status: 200 });
    }
    return new Response(JSON.stringify(providerBody), { status: providerStatus });
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.APIFY_API_TOKEN;
  delete process.env.BUNNY_STORAGE_HOST;
  delete process.env.BUNNY_STORAGE_ZONE;
  delete process.env.BUNNY_STORAGE_ACCESS_KEY;
  delete process.env.BUNNY_CDN_BASE_URL;
  delete process.env.BUNNY_CDN_TOKEN_KEY;
});

test("visual search requires an authenticated Firebase identity", async () => {
  const t = convexTest(schema, modules);
  await expect(t.action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(owner.subject) })).rejects.toThrow(
    /[Uu]nauthenticated/,
  );
});

test("visual search rejects media keys owned by another user", async () => {
  const t = convexTest(schema, modules);
  configureTestEnv();
  await seedAsset(t, other.tokenIdentifier, mediaKeyFor(other.subject));
  await expect(
    t.withIdentity(owner).action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(other.subject) }),
  ).rejects.toThrow(/does not belong to the authenticated user/);
});

test("visual search fails explicitly when the provider is unconfigured", async () => {
  const t = convexTest(schema, modules);
  await seedAsset(t, owner.tokenIdentifier, mediaKeyFor(owner.subject));
  await expect(
    t.withIdentity(owner).action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(owner.subject) }),
  ).rejects.toThrow(/VISION_PROVIDER_UNCONFIGURED/);
});

test("visual search normalizes provider rows and drops unusable ones", async () => {
  const t = convexTest(schema, modules);
  configureTestEnv();
  await seedAsset(t, owner.tokenIdentifier, mediaKeyFor(owner.subject));

  const fetchMock = fetchServing(new Uint8Array([1, 2, 3]), 200, apifyPayload());
  vi.stubGlobal("fetch", fetchMock);

  const { listings } = await t
    .withIdentity(owner)
    .action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(owner.subject) });

  expect(listings).toHaveLength(1);
  expect(listings[0]).toMatchObject({
    name: "Denim Jacket",
    brand: "Example Brand",
    merchantUrl: "https://merchant.example/jacket",
    source: "apify",
    observedPrice: { amount: 89.99, currency: "USD" },
    rating: 4.5,
  });
  const calls = fetchMock.mock.calls.map((call) => call as unknown as [string, RequestInit]);
  const apifyCall = calls.find(([url]) => url.includes("api.apify.com"));
  expect(apifyCall).toBeDefined();
  expect(String(apifyCall![1].body)).toContain("imagesBase64");
});

test("visual search surfaces an honest failure when the image matches nothing", async () => {
  const t = convexTest(schema, modules);
  configureTestEnv();
  await seedAsset(t, owner.tokenIdentifier, mediaKeyFor(owner.subject));
  vi.stubGlobal("fetch", fetchServing(new Uint8Array([1]), 200, []));

  await expect(
    t.withIdentity(owner).action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(owner.subject) }),
  ).rejects.toThrow(/no product matches/);
});

test("visual search reports provider HTTP failures instead of faking success", async () => {
  const t = convexTest(schema, modules);
  configureTestEnv();
  await seedAsset(t, owner.tokenIdentifier, mediaKeyFor(owner.subject));
  vi.stubGlobal("fetch", fetchServing(new Uint8Array([1]), 429, "rate limited"));

  await expect(
    t.withIdentity(owner).action(api.vision.searchByImage, { imageMediaKey: mediaKeyFor(owner.subject) }),
  ).rejects.toThrow(/Visual search provider returned HTTP 429/);
});
