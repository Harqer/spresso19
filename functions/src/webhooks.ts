import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { executeKitesurfPurchase } from './kitesurfService';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2025-01-27.acacia' as any
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_mock';

router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { productId, quantity, shippingAddress, userId, merchantUrl } = paymentIntent.metadata || {};
    
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

export const webhookRouter = router;
