import { onCall, HttpsError } from "firebase-functions/v2/https";
import { PubSub } from "@google-cloud/pubsub";
import * as z from "zod";

const pubsub = new PubSub();
const interactionsTopic = pubsub.topic("product-interactions");

const interactionSchema = z.object({
  action: z.string().min(1),
  productId: z.string().min(1),
  timestamp: z.string().optional(),
});

export const ingestInteraction = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in to log interactions.");
  }

  const parseResult = interactionSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError("invalid-argument", "Invalid interaction payload.");
  }

  const { action, productId, timestamp } = parseResult.data;
  const userUid = request.auth.uid;

  const eventPayload = {
    action,
    productId,
    userId: userUid,
    timestamp: timestamp || new Date().toISOString(),
  };

  try {
    // Fire and forget to Pub/Sub
    await interactionsTopic.publishMessage({
      json: eventPayload,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to publish interaction event to Pub/Sub", error);
    throw new HttpsError("internal", "Failed to log interaction.");
  }
});
