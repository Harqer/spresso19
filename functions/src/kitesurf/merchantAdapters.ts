export type MerchantSelectors = {
  login: readonly string[];
  botChallenge: readonly string[];
  paymentForm: readonly string[];
  placeOrder: readonly string[];
};

export type MerchantAdapter = {
  id: string;
  supportsCheckout: false;
  selectors: MerchantSelectors;
};

const publicPageOnlySelectors: MerchantSelectors = {
  login: [
    "input[type='password']",
    "form[action*='login' i]",
    "a[href*='login' i]",
  ],
  botChallenge: [
    "iframe[src*='captcha' i]",
    "[data-cf-beacon]",
    "#challenge-form",
  ],
  paymentForm: [
    "input[autocomplete='cc-number']",
    "input[name*='card' i]",
    "form[action*='payment' i]",
  ],
  placeOrder: [
    "button[type='submit']",
    "button[name*='place-order' i]",
    "[data-testid*='place-order' i]",
  ],
};

const publicPageOnlyAdapter: MerchantAdapter = {
  id: "public-page-only",
  supportsCheckout: false,
  selectors: publicPageOnlySelectors,
};

export function merchantAdapterFor(_hostname: string): MerchantAdapter {
  return publicPageOnlyAdapter;
}
