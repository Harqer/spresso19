import React, { useState, useEffect, useRef } from "react";
import { HITLPayload } from "../types";
import { auth, db, loginWithGoogle } from "../lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const StripeCheckoutForm = ({ onSuccess, onCancel, totalAmount }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMsg("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        setErrorMsg(error.message || "Payment could not be completed.");
      } else if (paymentIntent?.status === 'succeeded') {
        await onSuccess(paymentIntent);
      } else {
        setErrorMsg("Payment is not complete yet. Please try again.");
      }
    } catch (error: any) {
      setErrorMsg(error?.message || "Payment could not be completed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-[#d8ebd7] rounded-xl bg-white mt-4">
      <PaymentElement />
      {errorMsg && <div className="text-red-500 text-xs">{errorMsg}</div>}
      <div className="flex space-x-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition">Cancel</button>
        <button disabled={isProcessing || !stripe || !elements} className="flex-1 py-2 bg-[#386633] text-white font-bold rounded-xl transition shadow-xs flex items-center justify-center disabled:opacity-50">
          {isProcessing ? "Processing..." : `Pay $${totalAmount.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
};

interface HITLCheckoutModalProps {
  payload: HITLPayload | null;
  onClose: () => void;
  onSuccess?: (order: unknown) => void;
  onOrderConfirmed?: () => void;
}

interface CheckoutContext {
  shippingAddress: string;
  merchantUrl: string;
}

function readableShippingAddress(profile: Record<string, any>): string | null {
  const candidates = [
    profile.defaultShippingAddress,
    profile.shippingAddress,
    profile.defaultAddress,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length >= 5) {
      return candidate.trim();
    }
    if (candidate && typeof candidate === "object") {
      const formatted = candidate.formattedAddress || candidate.formatted || candidate.address;
      if (typeof formatted === "string" && formatted.trim().length >= 5) {
        return formatted.trim();
      }
    }
  }
  return null;
}

function requireHttpsMerchantUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("This item is missing a verified merchant checkout link.");
  }
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("This merchant checkout link is not secure.");
  }
  return url.toString();
}

export const HITLCheckoutModal: React.FC<HITLCheckoutModalProps> = ({
  payload,
  onClose,
  onSuccess,
  onOrderConfirmed,
}) => {
  if (!payload) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"gpay" | "fiat" | "crypto">("gpay");
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [checkoutContext, setCheckoutContext] = useState<CheckoutContext | null>(null);
  const idempotencyKey = useRef(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${payload.authorizationId}-${Date.now()}`,
  );

  useEffect(() => {
    // Trigger haptic vibration buzz on device to notify user of biometric purchase authorization
    if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
      try {
        navigator.vibrate([120, 60, 120]);
      } catch (e) {
        // Haptics unsupported or blocked
      }
    }
  }, [payload]);

  const handleFirebaseBiometricAuth = async () => {
    setIsBiometricAuthenticating(true);
    setErrorMessage("");
    try {
      await loginWithGoogle();
      if (!auth.currentUser) {
        throw new Error("Sign-in did not complete.");
      }
      await auth.currentUser.getIdToken(true);
      setBiometricVerified(true);
      if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
        try {
          navigator.vibrate(200);
        } catch (e) {
          // ignore
        }
      }
    } catch (error: any) {
      setErrorMessage("Authentication failed. Please try again.");
    } finally {
      setIsBiometricAuthenticating(false);
    }
  };

  const loadCheckoutContext = async (): Promise<CheckoutContext> => {
    const user = auth.currentUser;
    if (!user || user.isAnonymous) {
      throw new Error("Sign in to continue with checkout.");
    }

    const [profileSnapshot, productSnapshot] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "products", payload.product.id)),
    ]);
    if (!profileSnapshot.exists()) {
      throw new Error("Add a delivery address to your profile before checkout.");
    }
    if (!productSnapshot.exists()) {
      throw new Error("This item is no longer available from the catalog.");
    }

    const shippingAddress = readableShippingAddress(profileSnapshot.data());
    if (!shippingAddress) {
      throw new Error("Add a delivery address to your profile before checkout.");
    }
    const productData = productSnapshot.data();
    const merchantUrl = requireHttpsMerchantUrl(productData.merchantUrl || productData.productUrl);
    const context = { shippingAddress, merchantUrl };
    setCheckoutContext(context);
    return context;
  };

  // After Stripe confirms, the signed webhook — not this client — creates the
  // order. The client polls for the server-written order before showing
  // success, so a false confirmation can never render.
  const waitForServerOrder = async (paymentIntentId: string) => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        const ordersRef = collection(db, "users", auth.currentUser!.uid, "orders");
        const q = query(ordersRef, where("paymentIntentId", "==", paymentIntentId), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const orderDoc = snapshot.docs[0];
          onSuccess?.({ orderId: orderDoc.id, total: orderDoc.data().totalAmount || 0 });
          onOrderConfirmed?.();
          onClose();
          return;
        }
      } catch (e) {
        // Keep polling until the deadline; surface a generic failure after.
      }
    }
    throw new Error("Your payment was confirmed, but the order is still being saved. Please check your orders in a moment.");
  };

  const prepareStripeCheckout = async (context: CheckoutContext) => {
    const { functions } = await import("../lib/firebase");
    const { httpsCallable } = await import("firebase/functions");
    // The server prices the item from a fresh merchant quote and returns the
    // Stripe client secret. The client never chooses the amount.
    const prepareCheckout = httpsCallable(functions, "prepareCheckout");
    const result = await prepareCheckout({
      listingId: payload.product.id,
      quantity: payload.quantity,
      idempotencyKey: idempotencyKey.current,
    });
    const secret = (result.data as any)?.clientSecret;
    if (typeof secret !== "string" || secret.length === 0) {
      throw new Error("Unable to prepare checkout right now.");
    }
    const publishableKey = (result.data as any)?.publishableKey;
    if (typeof publishableKey !== "string" || !publishableKey.startsWith("pk_")) {
      throw new Error("Secure payment configuration is unavailable.");
    }
    setStripePromise((current) => current || loadStripe(publishableKey));
    setClientSecret(secret);
  };

  const handleConfirmPurchase = async () => {
    if (!biometricVerified) {
      setErrorMessage("Confirm your identity before placing the order.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const context = await loadCheckoutContext();

      if (paymentMethod === "fiat" || paymentMethod === "gpay") {
        await prepareStripeCheckout(context);
        return;
      }

      if (paymentMethod === "crypto") {
        throw new Error("USDC checkout is temporarily unavailable while secure passkey authorization is being configured.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white border border-[#d8ebd7] rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-[#18211e] space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#f3f3f4] text-[#5e5e63] transition cursor-pointer"
          title="Close"
        >
          <MaterialIcon icon="close" size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-[#e8f3e8] border border-[#d8ebd7] rounded-2xl text-[#386633] shrink-0">
            <MaterialIcon icon="shopping_bag" size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#18211e] font-serif">Review your purchase</h3>
            <p className="text-xs text-[#5e635f]">
              Check the item, delivery, and payment details, then place your order when you're ready.
            </p>
          </div>
        </div>

        {/* Product Summary */}
        <div className="p-4 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] space-y-3">
          <div className="flex items-center space-x-4">
            <img
              src={payload.product.image}
              alt={payload.product.name}
              className="w-16 h-16 rounded-xl object-cover border border-[#d8ebd7] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-[#18211e] truncate">
                {payload.product.name.includes("(") ? payload.product.name : `${payload.product.name} (Qty: ${payload.quantity})`}
              </h4>
              <p className="text-xs text-[#5e635f] mt-0.5 font-mono">
                SKU: {payload.product.sku || `SKU-${payload.product.id}`}
              </p>
            </div>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="pt-2 border-t border-[#d8ebd7] space-y-1.5 text-xs text-[#5e635f]">
            <div className="flex items-center justify-between">
              <span>Item Price x Quantity:</span>
              <span className="font-mono text-[#18211e] font-semibold">
                ${((payload.totalAmount || (payload.product.price * payload.quantity)) / (payload.quantity || 1)).toFixed(2)} × {payload.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping:</span>
              <span className="text-[#18211e] font-semibold">Calculated at checkout</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-[#18211e] pt-1 border-t border-dashed border-[#c4d6c3]">
              <span>Total Cost Before Confirmation:</span>
              <span className="text-base text-[#386633] font-mono font-extrabold">
                ${(payload.totalAmount || (payload.product.price * payload.quantity)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector (User Explicit Choice) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#18211e] block">
            Choose a payment method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("gpay")}
              className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-w-[90px] ${
                paymentMethod === "gpay"
                  ? "bg-[#1a1a1a] text-white border-black ring-2 ring-[#386633]"
                  : "bg-[#f8faf8] border-[#e2e2e2] hover:border-neutral-400 text-[#18211e]"
              }`}
            >
              <div>
                <MaterialIcon icon="payment" size={18} className={paymentMethod === "gpay" ? "text-white" : "text-[#386633]"} />
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold block truncate">Google Pay</span>
                <span className={`text-[9px] block truncate ${paymentMethod === "gpay" ? "text-neutral-300" : "text-[#556258]"}`}>
                  Secure wallet checkout
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setErrorMessage("USDC checkout is temporarily unavailable while secure passkey authorization is being configured.")}
              aria-disabled="true"
              className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-w-[90px] ${
                paymentMethod === "crypto"
                  ? "bg-[#e8f3e8] border-[#386633] ring-1 ring-[#386633]"
                  : "bg-[#f8faf8] border-[#e2e2e2] hover:border-neutral-400"
              }`}
            >
              <div>
                <MaterialIcon icon="currency_bitcoin" size={18} className="text-[#386633]" />
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold text-[#18211e] block truncate">Coinbase</span>
                <span className="text-[9px] text-[#556258] block truncate">USDC setup required</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("fiat")}
              className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-w-[90px] ${
                paymentMethod === "fiat"
                  ? "bg-[#e8f3e8] border-[#386633] ring-1 ring-[#386633]"
                  : "bg-[#f8faf8] border-[#e2e2e2] hover:border-neutral-400"
              }`}
            >
              <div>
                <MaterialIcon icon="credit_card" size={18} className="text-[#386633]" />
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold text-[#18211e] block truncate">Debit / Credit</span>
                <span className="text-[9px] text-[#556258] block truncate">Stripe</span>
              </div>
            </button>
          </div>
        </div>

        {/* Identity confirmation */}
        <div className="p-3.5 bg-[#f8faf8] rounded-2xl border border-[#e2e2e2] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#18211e] flex items-center space-x-1.5">
              <MaterialIcon icon="lock" size={16} className="text-[#386633]" />
              <span>Identity confirmation</span>
            </span>
            {biometricVerified ? (
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center space-x-1">
                <MaterialIcon icon="check" size={14} />
                <span>Confirmed</span>
              </span>
            ) : (
              <span className="text-[11px] text-[#5e635f]">
                Sign-in required
              </span>
            )}
          </div>

          {!biometricVerified && (
            <button
              type="button"
              onClick={handleFirebaseBiometricAuth}
              disabled={isBiometricAuthenticating}
              className="w-full py-3 bg-white hover:bg-[#f0f7f0] border border-[#386633] text-[#386633] font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-2xs disabled:opacity-50"
            >
              {isBiometricAuthenticating ? (
                <div className="flex items-center space-x-2 py-0.5">
                  <M3ExpressiveCircularProgress size={24} icon="fingerprint" />
                  <span>Confirming your identity...</span>
                </div>
              ) : (
                <>
                  <MaterialIcon icon="fingerprint" size={18} />
                  <span>Confirm your identity</span>
                </>
              )}
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
            <MaterialIcon icon="warning" size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Confirmation Button or Stripe Elements */}
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripeCheckoutForm 
               totalAmount={payload.totalAmount || (payload.product.price * payload.quantity)}
               onCancel={() => setClientSecret(null)}
               onSuccess={async (intent: any) => {
                 if (!checkoutContext) {
                   throw new Error("Checkout details expired. Please start again.");
                 }
                 await waitForServerOrder(intent.id);
               }}
            />
          </Elements>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout information"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-[#f2f8f2]"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <M3ExpressiveCircularProgress size={22} colorClass="stroke-white" />
                <span>Preparing checkout...</span>
              </div>
            ) : (
              <>
                <MaterialIcon icon="shopping_bag" size={20} />
                <span>
                  {paymentMethod === "gpay"
                    ? "Pay with Google Pay"
                    : paymentMethod === "crypto"
                    ? "Confirm USDC Crypto Purchase"
                    : "Confirm Card Purchase"} • ${(payload.totalAmount || (payload.product.price * payload.quantity)).toFixed(2)}
                </span>
              </>
            )}
          </button>
        )}
        <div className="mt-6 space-y-4 text-sm text-[#48524d]">
          <p>Your item is in the Spresso cart. Open the merchant listing to confirm the current price, availability, delivery options, and payment there.</p>
          <p>Spresso does not reserve retailer inventory or submit payment on your behalf.</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full cursor-pointer rounded-xl bg-[#386633] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2c5227]"
        >
          Back to cart
        </button>
      </div>
    </div>
  );
};
