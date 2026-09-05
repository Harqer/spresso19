import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { DiscoveredListingSchema } from "../contracts/discoveredListing";
import { addListingToCart } from "./addListingToCart";

const AddToCartSchema = z.object({
  listing: DiscoveredListingSchema,
  quantity: z.number().int().positive().max(25),
  idempotencyKey: z.string().uuid(),
}).strict();

export const addToCart = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to update your cart.");
  const input = AddToCartSchema.safeParse(request.data);
  if (!input.success) throw new HttpsError("invalid-argument", "A valid product and quantity are required.");

  const { listing, quantity, idempotencyKey } = input.data;
  try {
    return await addListingToCart(request.auth.uid, listing, quantity, idempotencyKey);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof Error && error.message === "A cart item cannot exceed 25 units.") {
      throw new HttpsError("invalid-argument", error.message);
    }
    throw error;
  }
});
