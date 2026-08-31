import { createCartListingSnapshot } from "./discoveryRepository";
import type { CartItem, ProductItem } from "../types";

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 25) {
    throw new Error("Cart quantity must be a whole number between 1 and 25.");
  }
}

export function createCartItem(product: ProductItem, quantity: number): CartItem {
  if (!product.listing) {
    throw new Error("A verified merchant listing is required.");
  }

  validateQuantity(quantity);
  return {
    product,
    listing: createCartListingSnapshot(product.listing, quantity),
    quantity,
  };
}

export function withCartQuantity(item: CartItem, quantity: number): CartItem {
  validateQuantity(quantity);
  return {
    ...item,
    listing: {
      ...item.listing,
      quantity,
    },
    quantity,
  };
}
