import React from "react";
import { HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";

interface HITLCheckoutModalProps {
  payload: HITLPayload | null;
  onClose: () => void;
  onSuccess?: (order: unknown) => void;
  onOrderConfirmed?: () => void;
}

export const HITLCheckoutModal: React.FC<HITLCheckoutModalProps> = ({ payload, onClose }) => {
  if (!payload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[#d8ebd7] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#18211e]">Continue with the merchant</h2>
            <p className="mt-1 text-sm text-[#5e635f]">{payload.product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout information"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-[#f2f8f2]"
          >
            <MaterialIcon icon="close" size={18} />
          </button>
        </div>

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
