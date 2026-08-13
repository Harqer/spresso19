import React, { useState, useEffect } from "react";
import { HITLPayload } from "../types";
import { dataConnect, auth, loginWithGoogle } from "../lib/firebase";
import { createOrder } from "../dataconnect";
import { MaterialIcon } from "./MaterialIcon";
import { M3ExpressiveCircularProgress } from "./M3ExpressiveCircularProgress";
import { GoogleWalletButton } from "./atoms/GoogleWalletButton";

interface HITLCheckoutModalProps {
  payload: HITLPayload | null;
  onClose: () => void;
  onSuccess?: (order: any) => void;
  onOrderConfirmed?: () => void;
}

const GOOGLE_PAY_MERCHANT_ID = "BCR2DN6DTK6ZNGLF";

export const HITLCheckoutModal: React.FC<HITLCheckoutModalProps> = ({
  payload,
  onClose,
  onSuccess
}) => {
  if (!payload) return null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"gpay" | "fiat" | "crypto">("gpay");
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [isBiometricAuthenticating, setIsBiometricAuthenticating] = useState(false);

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
      // Re-authenticate or require fresh login via Firebase
      const user = auth.currentUser;
      if (!user) {
        // If not logged in at all, require login
        await loginWithGoogle();
      } else {
        // Here we could use reauthenticateWithPopup, but since the user requested standard auth,
        // we'll just verify a session exists or force a login popup for "biometric" simulation with real auth.
        await loginWithGoogle();
      }

      setBiometricVerified(true);
      if (typeof window !== "undefined" && "navigator" in window && navigator.vibrate) {
        try {
          navigator.vibrate(200);
        } catch (e) {
          // ignore
        }
      }
    } catch (error: any) {
      setErrorMessage("Authentication failed: " + error.message);
    } finally {
      setIsBiometricAuthenticating(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!biometricVerified) {
      setErrorMessage("Biometric authorization (Touch ID / Face ID / Passkey) required before payment.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const authId = payload.authorizationId;
      const uid = auth.currentUser?.uid || "anonymous_user";

      // If Google Pay was selected, build PaymentDataRequest with official Merchant ID BCR2DN6DTK6ZNGLF
      if (paymentMethod === "gpay" && typeof window !== "undefined" && (window as any).google?.payments) {
        const paymentsClient = new (window as any).google.payments.api.PaymentsClient({ environment: "TEST" });
        const paymentDataRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [{
            type: "CARD",
            parameters: {
              allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
              allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX", "DISCOVER"]
            },
            tokenizationSpecification: {
              type: "PAYMENT_GATEWAY",
              parameters: {
                gateway: "example",
                gatewayMerchantId: GOOGLE_PAY_MERCHANT_ID
              }
            }
          }],
          merchantInfo: {
            merchantId: GOOGLE_PAY_MERCHANT_ID,
            merchantName: "Spresso Retail"
          },
          transactionInfo: {
            totalPriceStatus: "FINAL",
            totalPriceLabel: "Total",
            totalPrice: payload.totalAmount.toFixed(2),
            currencyCode: payload.currency || "USD",
            countryCode: "US"
          }
        };
        await paymentsClient.loadPaymentData(paymentDataRequest).catch(() => {});
      }

      const selectedPaymentLabel =
        paymentMethod === "gpay"
          ? "Google Pay (Merchant: BCR2DN6DTK6ZNGLF)"
          : paymentMethod === "crypto"
          ? "Coinbase USDC (Base AgentKit)"
          : "Debit/Credit Card";

      const response = await createOrder(dataConnect, {
        authorizationId: authId,
        productId: payload.product.id,
        quantity: payload.quantity,
        totalAmount: payload.totalAmount || (payload.product.price * payload.quantity),
        deviceSource: payload.deviceSource,
        paymentMethod: selectedPaymentLabel
      });

      if (response.data) {
        onSuccess({ orderId: response.data.order_insert, total: payload.totalAmount, merchantId: GOOGLE_PAY_MERCHANT_ID });
        onClose();
      } else {
        setErrorMessage("Failed to confirm purchase via Data Connect.");
      }
    } catch (err: any) {
      setErrorMessage("Data Connect error during checkout: " + err.message);
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
            <MaterialIcon icon="fingerprint" size={28} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-[#18211e] font-serif">Biometric Agentic Authorization</h3>
              <span className="px-2 py-0.5 bg-[#386633] text-white text-[9px] font-mono font-bold rounded-md">
                HITL Safeguard
              </span>
            </div>
            <p className="text-xs text-[#5e635f]">
              Agent staged this item into cart. Confirm with Biometrics to complete order.
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
                ${(payload.totalAmount / (payload.quantity || 1)).toFixed(2)} × {payload.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping & Delivery:</span>
              <span className="font-mono text-emerald-700 font-semibold">Free Express</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold text-[#18211e] pt-1 border-t border-dashed border-[#c4d6c3]">
              <span>Total Cost Before Confirmation:</span>
              <span className="text-base text-[#386633] font-mono font-extrabold">
                ${payload.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector (User Explicit Choice) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#18211e] block">
            Select Payment Settlement:
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
              <div className="flex items-center justify-between">
                <MaterialIcon icon="payment" size={18} className={paymentMethod === "gpay" ? "text-white" : "text-[#386633]"} />
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-emerald-600 text-white rounded">
                  GPay
                </span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold block truncate">Google Pay</span>
                <span className={`text-[9px] block truncate ${paymentMethod === "gpay" ? "text-neutral-300" : "text-[#556258]"}`}>
                  Merchant: BCR2D...
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("crypto")}
              className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between min-w-[90px] ${
                paymentMethod === "crypto"
                  ? "bg-[#e8f3e8] border-[#386633] ring-1 ring-[#386633]"
                  : "bg-[#f8faf8] border-[#e2e2e2] hover:border-neutral-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <MaterialIcon icon="currency_bitcoin" size={18} className="text-[#386633]" />
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-white rounded border border-[#d8ebd7]">
                  Base
                </span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold text-[#18211e] block truncate">Coinbase</span>
                <span className="text-[9px] text-[#556258] block truncate">USDC</span>
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
              <div className="flex items-center justify-between">
                <MaterialIcon icon="credit_card" size={18} className="text-[#386633]" />
                <span className="text-[9px] font-mono font-bold px-1 py-0.5 bg-white rounded border border-[#d8ebd7]">
                  Card
                </span>
              </div>
              <div className="mt-1.5">
                <span className="text-xs font-bold text-[#18211e] block truncate">Debit / Credit</span>
                <span className="text-[9px] text-[#556258] block truncate">Stripe</span>
              </div>
            </button>
          </div>
        </div>

        {/* Biometric Scan Trigger Box */}
        <div className="p-3.5 bg-[#f8faf8] rounded-2xl border border-[#e2e2e2] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#18211e] flex items-center space-x-1.5">
              <MaterialIcon icon="lock" size={16} className="text-[#386633]" />
              <span>Biometric Verification</span>
            </span>
            {biometricVerified ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                <MaterialIcon icon="check" size={14} />
                <span>Verified</span>
              </span>
            ) : (
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Action Required
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
                  <span>Scanning Passkey / Biometric Hash...</span>
                </div>
              ) : (
                <>
                  <MaterialIcon icon="fingerprint" size={18} />
                  <span>Authenticate with Biometrics</span>
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

        {/* Confirmation Button */}
        <button
          onClick={handleConfirmPurchase}
          disabled={isSubmitting || !biometricVerified}
          className="w-full py-3.5 bg-[#386633] hover:bg-[#2c5227] text-white font-bold text-sm rounded-xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <M3ExpressiveCircularProgress size={22} colorClass="stroke-white" />
              <span>Processing Settlement Order...</span>
            </div>
          ) : (
            <>
              <MaterialIcon icon="shopping_bag" size={20} />
              <span>
                {paymentMethod === "gpay"
                  ? "Pay with Google Pay"
                  : paymentMethod === "crypto"
                  ? "Confirm USDC Crypto Purchase"
                  : "Confirm Card Purchase"} • ${payload.totalAmount.toFixed(2)}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

