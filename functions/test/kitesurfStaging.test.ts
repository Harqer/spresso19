import assert from "node:assert/strict";
import test from "node:test";
import { executeKitesurfPurchase, stageKitesurfListing } from "../src/kitesurfService";
import type { DiscoveredListing } from "../src/contracts/discoveredListing";

const discoveredAt = "2026-08-30T12:00:00.000Z";
const allowedDomains = ["merchant.example"];

function listing(merchantUrl = "https://merchant.example/products/espresso"): DiscoveredListing {
  return {
    id: "kitesurf-7dbd3f6a",
    name: "Espresso Maker",
    merchantUrl,
    source: "kitesurf",
    discoveredAt,
  };
}

function browser(signals: Record<string, unknown> = {}) {
  return {
    inspectPublicListing: async () => ({
      finalUrl: "https://merchant.example/products/espresso",
      price: "$1,249.50",
      currency: "USD",
      ...signals,
    }),
  };
}

test("rejects non-HTTPS merchant URLs before browser navigation", async () => {
  const result = await stageKitesurfListing(listing("http://merchant.example/products/espresso"), {
    allowedDomains,
    browser: browser(),
  });

  assert.deepEqual(result, {
    status: "failed",
    steps: ["Merchant URL was rejected before navigation."],
    failureReason: "disallowed_domain",
  });
});

test("rejects merchant domains outside the configured allowlist", async () => {
  const result = await stageKitesurfListing(listing("https://untrusted.example/products/espresso"), {
    allowedDomains,
    browser: browser(),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.failureReason, "disallowed_domain");
});

test("returns incompatibility for a login-required merchant page", async () => {
  const result = await stageKitesurfListing(listing(), {
    allowedDomains,
    browser: browser({ loginRequired: true }),
  });

  assert.equal(result.status, "incompatible");
  assert.equal(result.failureReason, "login_required");
});

test("returns incompatibility for a bot challenge", async () => {
  const result = await stageKitesurfListing(listing(), {
    allowedDomains,
    browser: browser({ botChallenge: true }),
  });

  assert.equal(result.status, "incompatible");
  assert.equal(result.failureReason, "bot_challenge");
});

test("returns incompatibility for unsupported payment forms", async () => {
  const result = await stageKitesurfListing(listing(), {
    allowedDomains,
    browser: browser({ paymentFormDetected: true }),
  });

  assert.equal(result.status, "incompatible");
  assert.equal(result.failureReason, "unsupported_checkout");
});

test("fails closed when a listing has no merchant URL", async () => {
  const result = await stageKitesurfListing({ ...listing(), merchantUrl: "" } as DiscoveredListing, {
    allowedDomains,
    browser: browser(),
  });

  assert.equal(result.status, "failed");
  assert.equal(result.failureReason, "missing_listing");
});

test("stages a public listing, parses its numeric price, and stops before place-order controls", async () => {
  const result = await stageKitesurfListing(listing(), {
    allowedDomains,
    browser: browser({ placeOrderControlDetected: true }),
  });

  assert.deepEqual(result, {
    status: "staged",
    finalUrl: "https://merchant.example/products/espresso",
    observedPrice: {
      amount: 1249.5,
      currency: "USD",
      evidenceUrl: "https://merchant.example/products/espresso",
    },
    steps: [
      "Opened the allowlisted public merchant listing.",
      "Observed the current merchant price.",
      "Stopped before the merchant place-order control.",
    ],
  });
});

test("hard-stops the retired purchase entrypoint before any order or payment action", async () => {
  await assert.rejects(
    executeKitesurfPurchase(),
    /user-completed.*cannot submit orders or payment credentials/i,
  );
});
