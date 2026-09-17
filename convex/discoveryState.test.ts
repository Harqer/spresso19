/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const owner = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-owner",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-owner",
};
const other = {
  issuer: "https://securetoken.google.com/get-spresso",
  subject: "firebase-uid-other",
  tokenIdentifier: "https://securetoken.google.com/get-spresso:firebase-uid-other",
};

test("recommendation state reads are owner-scoped and reflect durable user state", async () => {
  const t = convexTest(schema, modules);
  const authenticated = t.withIdentity(owner);

  await authenticated.mutation(api.reactiveState.setPreferences, {
    galleryPermission: "GRANTED",
    searchInquiries: ["waterproof jacket"],
    vibes: ["minimal"],
  });
  await authenticated.mutation(api.reactiveState.setSavedProduct, { productId: "parallel:listing-9", saved: true });
  await authenticated.mutation(api.reactiveState.setLikedProduct, { productId: "kitesurf:trainer-x", liked: true });
  // Noise from another user must never leak into the owner's feed inputs.
  await t.withIdentity(other).mutation(api.reactiveState.setSavedProduct, { productId: "serpapi:not-mine", saved: true });

  expect(await authenticated.query(internal.discoveryState.myPreferences, {})).toMatchObject({
    searchInquiries: ["waterproof jacket"],
    vibes: ["minimal"],
  });
  expect(await authenticated.query(internal.discoveryState.mySavedProductIds, {})).toEqual(["parallel:listing-9"]);
  expect(await authenticated.query(internal.discoveryState.myLikedProductIds, {})).toEqual(["kitesurf:trainer-x"]);
  expect(await authenticated.query(internal.discoveryState.myRecentOrderListingNames, {})).toEqual([]);
  expect(await t.withIdentity(other).query(internal.discoveryState.mySavedProductIds, {})).toEqual(["serpapi:not-mine"]);
  await expect(t.query(internal.discoveryState.myPreferences, {})).rejects.toThrow(/[Uu]nauthenticated/);
});
