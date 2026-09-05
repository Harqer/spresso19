"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantAdapterFor = merchantAdapterFor;
const publicPageOnlySelectors = {
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
const publicPageOnlyAdapter = {
    id: "public-page-only",
    supportsCheckout: false,
    selectors: publicPageOnlySelectors,
};
function merchantAdapterFor(_hostname) {
    return publicPageOnlyAdapter;
}
//# sourceMappingURL=merchantAdapters.js.map