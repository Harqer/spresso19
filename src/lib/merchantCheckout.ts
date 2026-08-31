import type { ProductItem } from "../types";

export type MerchantCheckoutActions = {
  addToCart: (product: ProductItem) => Promise<void>;
  openCart: () => void;
};

export function verifiedMerchantUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function requestMerchantCheckout(
  product: ProductItem,
  actions: MerchantCheckoutActions,
): Promise<void> {
  if (!product.listing || !verifiedMerchantUrl(product.listing.merchantUrl)) {
    throw new Error("A verified merchant listing is required.");
  }

  await actions.addToCart(product);
  actions.openCart();
}
