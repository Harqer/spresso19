import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import { executeKitesurfPurchase } from './kitesurfService';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

export const stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  const stripe = new Stripe(stripeSecretKey.value(), {
    apiVersion: '2025-01-27.acacia' as any
  });

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig as string,
      stripeWebhookSecret.value()
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { productId, shippingAddress, merchantUrl } = paymentIntent.metadata || {};
    
    // Autonomous Kitesurf Trigger
    if (productId) {
      try {
        const kResult = await executeKitesurfPurchase(
          productId, 
          shippingAddress || "123 Innovation Way, Tech District, SF", 
          "", 
          merchantUrl || "https://example.com", 
          true, 
          true
        );
        console.log("Kitesurf purchase triggered via webhook", kResult);
      } catch(err) {
        console.error("Failed to execute kitesurf on webhook:", err);
      }
    }
  }

  res.send();
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';

export const createStripeIntent = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to checkout.");
  }

  try {
    const { productId, quantity, shippingAddress, merchantUrl } = request.data || {};
    if (!productId) {
      throw new HttpsError("invalid-argument", "Missing productId");
    }
    // Hardcoded amount for demo if not querying product DB
    const amount = 5000; 

    const stripe = new Stripe(stripeSecretKey.value(), {
      apiVersion: '2025-01-27.acacia' as any
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        productId,
        quantity: quantity?.toString() || '1',
        shippingAddress,
        merchantUrl
      }
    });

    return { clientSecret: paymentIntent.client_secret };
  } catch (err: any) {
    console.error("Failed to create stripe intent:", err);
    throw new HttpsError("internal", "Failed to create secure checkout session.");
  }
});
