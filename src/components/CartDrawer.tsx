import React from "react";
import { CartItem, HITLPayload } from "../types";
import { MaterialIcon } from "./MaterialIcon";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onRequestHITLCheckout: (payload: HITLPayload) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onRequestHITLCheckout
}) => {
  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;

    const firstProduct = cart[0].product;
    const totalQuantity = cart.reduce((q, i) => q + i.quantity, 0);

    const payload: HITLPayload = {
      authorizationId: `CART-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      product: {
        id: firstProduct.id,
        name: cart.length === 1 ? firstProduct.name : `${cart.length} Marketplace Items (${firstProduct.name} & more)`,
        price: subtotal / totalQuantity,
        sku: firstProduct.sku,
        image: firstProduct.image
      },
      quantity: totalQuantity,
      totalAmount: subtotal,
      currency: "USD",
      deviceSource: "WEB",
      inventoryConfirmed: true,
      stockRemaining: firstProduct.stock,
      humanInTheLoopChallenge: {
        title: "Confirm Cart Purchase",
        message: `Authorize payment of $${subtotal.toFixed(2)} for ${cart.length} item(s) in your Spresso Cart?`,
        safetyChecks: [
          `Verified ${cart.length} item(s) reserved for checkout`,
          "Includes free express delivery",
          "Requires human confirmation token"
        ]
      }
    };

    onClose();
    onRequestHITLCheckout(payload);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#e2e2e2] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#d8ebd7] flex items-center justify-between bg-[#f2f8f2]">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-[#386633] text-white rounded-xl shadow-xs">
              <MaterialIcon icon="shopping_bag" size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18211e]">Your Shopping Cart</h3>
              <p className="text-xs text-[#5e635f]">
                {cart.length === 0 ? "Empty" : `${cart.length} item(s) selected`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#5e635f] hover:bg-[#e8f3e8] rounded-full transition cursor-pointer"
            title="Close Drawer"
          >
            <MaterialIcon icon="close" size={20} />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
          {cart.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4 flex flex-col items-center justify-center h-full">
              {/* High-quality shopping tote artwork image */}
              <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-xs border border-[#d8ebd7] bg-[#f2f8f2]">
                <img
                  src="https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80"
                  alt="Empty Shopping Cart"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent flex items-end justify-center p-2">
                  <span className="px-2 py-0.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-mono font-bold text-[#18211e] flex items-center space-x-1 shadow-xs">
                    <MaterialIcon icon="shopping_bag" size={12} className="text-[#386633]" />
                    <span>Cart Ready</span>
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-base font-bold text-[#18211e]">Your Shopping Cart is Empty</h4>
                <p className="text-xs text-[#5e635f] leading-relaxed">
                  Discover curated fashion, lifestyle, and grocery picks tailored to your preferences with Spresso AI.
                </p>
              </div>

              <button
                onClick={onClose}
                className="mt-2 py-2 px-5 bg-[#386633] hover:bg-[#2c5227] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <MaterialIcon icon="auto_awesome" size={15} />
                <span>Ask AI Personal Shopper</span>
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.product.id}
                className="flex items-center space-x-3 p-3 bg-[#f2f8f2] rounded-2xl border border-[#d8ebd7] hover:border-[#386633]/50 transition"
              >
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-xl object-cover border border-[#d8ebd7]"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-xs font-bold text-[#18211e] truncate">{item.product.name}</h4>
                  <p className="text-[10px] text-[#5e635f]">{item.product.brand}</p>
                  <div className="text-xs font-bold font-mono text-[#386633]">
                    ${item.product.price}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-1.5 bg-white border border-[#b0d4af] rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="w-6 h-6 flex items-center justify-center text-[#18211e] hover:bg-[#e8f3e8] rounded transition font-bold cursor-pointer"
                      title="Decrease"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold w-5 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      className="w-6 h-6 flex items-center justify-center text-[#18211e] hover:bg-[#e8f3e8] rounded transition font-bold cursor-pointer"
                      title="Increase"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-[10px] text-red-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <MaterialIcon icon="delete" size={12} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-[#d8ebd7] bg-[#f2f8f2] space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5e635f]">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-[#18211e]">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5e635f]">
                <span>Express Shipping</span>
                <span className="font-mono text-[#386633] font-bold">FREE</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#18211e] pt-2 border-t border-[#d8ebd7]">
                <span>Total Amount</span>
                <span className="font-mono text-[#386633] text-base">${subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={onClearCart}
                className="px-3 py-2.5 border border-[#b0d4af] hover:bg-[#e8f3e8] text-[#18211e] font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Clear
              </button>

              <button
                onClick={handleProceedToCheckout}
                className="flex-1 py-2.5 bg-[#386633] hover:bg-[#2c5227] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <MaterialIcon icon="lock" size={16} />
                <span>Express HITL Checkout (${subtotal.toFixed(2)})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
