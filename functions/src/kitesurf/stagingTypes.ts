import type { DiscoveredListing } from "../contracts/discoveredListing";

export type MerchantStagingFailureReason =
  | "disallowed_domain"
  | "login_required"
  | "bot_challenge"
  | "unsupported_checkout"
  | "network_error"
  | "missing_listing";

export type MerchantStagingResult = {
  status: "staged" | "incompatible" | "failed";
  finalUrl?: string;
  observedPrice?: DiscoveredListing["observedPrice"];
  steps: string[];
  failureReason?: MerchantStagingFailureReason;
};

export type MerchantPageSignals = {
  finalUrl?: string;
  price?: string | number;
  currency?: string;
  loginRequired?: boolean;
  botChallenge?: boolean;
  paymentFormDetected?: boolean;
  placeOrderControlDetected?: boolean;
};

export interface MerchantBrowser {
  inspectPublicListing(input: {
    url: string;
    requestLimit: number;
    timeoutMs: number;
  }): Promise<MerchantPageSignals>;
}

export type MerchantStagingOptions = {
  allowedDomains?: readonly string[];
  browser?: MerchantBrowser;
};
