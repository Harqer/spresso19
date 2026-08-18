import Logger from "../../../../lib/Logger";
import React, { useState, useEffect } from "react";
import { MaterialIcon } from "../../../MaterialIcon";
import { getPaymentMethods, createPaymentMethod, deletePaymentMethod } from "@firebasegen/spresso-connector";

export function PaymentCardsWidget() {
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [activeModal, setActiveModal] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchCards = async () => {
      try {
        const cardsRes = await getPaymentMethods();
        if (isMounted && cardsRes.data.paymentMethods) {
          setSavedCards(cardsRes.data.paymentMethods as any);
        }
      } catch (err) {
        Logger.error("Failed to load cards:", err);
      } finally {
        if (isMounted) setIsLoadingCards(false);
      }
    };
    fetchCards();
    return () => { isMounted = false; };
  }, []);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardNumber) return;

    try {
      const res = await createPaymentMethod({ stripePaymentMethodId: newCardNumber });
      if (res.data.paymentMethod_insert) {
        setSavedCards((prev) => [...prev, {
          id: res.data.paymentMethod_insert,
          brand: "Visa",
          last4: newCardNumber.slice(-4),
          expiry: newCardExpiry
        } as any]);
      }
    } catch (err) {
      Logger.error("Failed to add card:", err);
    } finally {
      setNewCardNumber("");
      setNewCardExpiry("");
      setActiveModal(false);
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    try {
      await deletePaymentMethod({ id: cardId as any });
      setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch (err) {
      Logger.error("Failed to delete card:", err);
    }
  };

  return (
    <>
      <div className="p-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 text-[var(--md-sys-color-primary)] font-bold">
            <MaterialIcon icon="credit_card" size={20} />
            <span className="text-sm">Saved Payment Cards & Wallet</span>
          </div>
          <button
            onClick={() => setActiveModal(true)}
            className="text-xs font-bold text-[var(--md-sys-color-primary)] flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <MaterialIcon icon="add_card" size={16} />
            <span>Add Card</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {isLoadingCards ? (
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Loading payment cards...</p>
          ) : savedCards.map((card) => (
            <div
              key={card.id}
              className="p-4 rounded-2xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)] flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <MaterialIcon icon="payment" size={22} className="text-[var(--md-sys-color-primary)]" />
                <div>
                  <p className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">{card.brand} •••• {card.last4}</p>
                  <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Expires {card.expiry}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {card.isDefault && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Default
                  </span>
                )}
                <button
                  onClick={() => handleRemoveCard(card.id)}
                  className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 cursor-pointer"
                  title="Remove Card"
                >
                  <MaterialIcon icon="delete" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--md-sys-color-surface)] rounded-3xl max-w-md w-full p-6 space-y-4 border border-[var(--md-sys-color-outline-variant)] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--md-sys-color-on-surface)]">Add Payment Card</h3>
              <button onClick={() => setActiveModal(false)} className="text-[var(--md-sys-color-on-surface-variant)] cursor-pointer">
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCard} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="4242 4242 4242 4242"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[var(--md-sys-color-on-surface)]">Expiry Date</label>
                <input
                  type="text"
                  required
                  placeholder="MM/YY"
                  value={newCardExpiry}
                  onChange={(e) => setNewCardExpiry(e.target.value)}
                  className="w-full py-2.5 px-3 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-xl text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] font-bold text-xs cursor-pointer shadow-xs"
              >
                Save Payment Card
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
