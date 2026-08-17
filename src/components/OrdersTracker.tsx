import React, { useState, useEffect } from "react";
import { authFetch } from "../lib/firebase";
import { OrderRecord } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { GoogleWalletButton } from "@/src/components/features/profile/GoogleWalletButton";
import { AnimatedTicketCard } from "@/src/components/features/orders/AnimatedTicketCard";

interface OrdersTrackerProps {
  orders: OrderRecord[];
  onAskAI?: (text: string, image?: string | null) => void;
  onRefreshOrders?: () => void;
}

export const OrdersTracker: React.FC<OrdersTrackerProps> = ({ orders, onAskAI, onRefreshOrders }) => {
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [liveOrders, setLiveOrders] = useState<OrderRecord[]>(orders);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch("/api/orders");
        const data = await res.json();
        if (data.success && data.orders) {
          setLiveOrders(data.orders);
        } else {
          setLiveOrders([]);
        }
      } catch (e) {
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrders();
  }, []);
  const [returnReason, setReturnReason] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleSetReminder = async (orderId: string) => {
    setLoadingAction(`reminder-${orderId}`);
    try {
      const res = await authFetch("/api/orders/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reminderTime: "Today at 5:00 PM (Arrival Alert)" })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Delivery arrival reminder set for ${orderId}!`);
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (e) {
    } finally {
      setLoadingAction(null);
      setActionSuccessMsg(null);
    }
  };

  const handleInitiateReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrderId) return;

    setLoadingAction(`return-${returnModalOrderId}`);
    try {
      const res = await authFetch("/api/orders/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: returnModalOrderId, reason: returnReason || "Customer return request" })
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMsg(`Return initiated for ${returnModalOrderId}. Prepaid shipping label dispatched.`);
        setReturnModalOrderId(null);
        setReturnReason("");
        if (onRefreshOrders) onRefreshOrders();
      }
    } catch (e) {
    } finally {
      setLoadingAction(null);
      setActionSuccessMsg(null);
    }
  };

  const getStatusBadge = (order: OrderRecord) => {
    if (order.status === "RETURN_REQUESTED" || order.returnStatus === "REQUESTED") {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center space-x-1">
          <MaterialIcon icon="undo" size={14} className="text-amber-600" />
          <span>RETURN REQUESTED</span>
        </span>
      );
    }
    if (order.status === "DELIVERED") {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center space-x-1">
          <MaterialIcon icon="mark_email_read" size={14} className="text-emerald-600" />
          <span>DELIVERED</span>
        </span>
      );
    }
    if (order.status === "IN_TRANSIT") {
      return (
        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center space-x-1">
          <MaterialIcon icon="local_shipping" size={14} className="text-blue-600" />
          <span>IN TRANSIT</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#e8f3e8] text-[#386633] border border-[#d8ebd7] rounded-full flex items-center space-x-1">
        <MaterialIcon icon="check_circle" size={14} className="text-[#386633]" />
        <span>CONFIRMED</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs text-[#18211e]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#e8f3e8] border border-[#d8ebd7] rounded-2xl text-[#386633]">
              <MaterialIcon icon="receipt_long" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#18211e] font-headline">Order History & Post-Purchase Concierge</h2>
              <p className="text-xs text-[#5e635f] mt-0.5">
                Track live package status, schedule arrival reminders & manage hassle-free returns
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#386633] bg-[#f2f8f2] px-3 py-1.5 rounded-xl border border-[#d8ebd7] flex items-center space-x-1.5">
              <MaterialIcon icon="smart_toy" size={16} />
              <span>Shopping Concierge Active</span>
            </span>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-[#e8f3e8] border border-[#386633] text-[#386633] rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
          <MaterialIcon icon="check_circle" size={18} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center text-[#5e635f] space-y-3 shadow-xs">
          <div className="w-12 h-12 border-4 border-[#386633] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-[#18211e]">Loading Live Orders...</h3>
        </div>
      ) : liveOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center text-[#5e635f] space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-[#f2f8f2] text-[#386633] rounded-2xl flex items-center justify-center mx-auto">
            <MaterialIcon icon="inventory_2" size={28} />
          </div>
          <h3 className="text-sm font-bold text-[#18211e]">No Orders Placed Yet</h3>
          <p className="text-xs max-w-md mx-auto text-[#5e635f]">
            Start chatting or browse the catalog to make your first purchase.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {liveOrders.map(order => {
            const isReminderSet = order.reminderSet;
            const isReturnRequested = order.status === "RETURN_REQUESTED" || order.returnStatus === "REQUESTED";

            return (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-5 text-[#18211e]"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f2f8f2] pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-[#18211e] font-mono">{order.id}</span>
                    {getStatusBadge(order)}
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-[#5e635f] font-mono">
                    <span className="flex items-center space-x-1">
                      <MaterialIcon icon="schedule" size={16} />
                      <span>{new Date(order.humanConfirmedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                    {order.mcpTransactionHash && (
                      <span className="hidden md:inline-block text-[10px] text-[#8a928c]">
                        Hash: {order.mcpTransactionHash.substring(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-4 bg-[#f8faf8] p-3 rounded-2xl border border-[#d8ebd7]">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-xl object-cover border border-[#d8ebd7] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-[#5e635f] uppercase">{item.product.brand}</span>
                        <h4 className="text-xs font-bold text-[#18211e] truncate">{item.product.name}</h4>
                        <p className="text-[10px] text-[#5e635f]">
                          Qty: {item.quantity} • Unit Price: ${item.product.price.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#386633] font-mono shrink-0">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Live Logistics & Tracking Widget */}
                <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <MaterialIcon icon="local_shipping" size={20} className="text-[#386633]" />
                      <span className="text-xs font-bold text-[#18211e]">Logistics & Delivery Tracking</span>
                    </div>
                    {order.carrier && (
                      <span className="text-[11px] font-mono text-[#5e635f] font-bold">
                        {order.carrier} • {order.trackingNumber || "FX-8492019"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-[#d8ebd7]">
                      <span className="text-[10px] text-[#5e635f] font-bold uppercase block">Current Location / Status</span>
                      <span className="font-semibold text-[#18211e]">
                        {order.trackingStatus || "In Transit - Out for Delivery Vehicle"}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#d8ebd7]">
                      <span className="text-[10px] text-[#5e635f] font-bold uppercase block">Estimated Arrival</span>
                      <span className="font-bold text-[#386633] font-mono">
                        {order.estimatedDelivery || "Today, 5:00 PM"}
                      </span>
                    </div>
                  </div>

                  {order.returnReason && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <strong>Return Note:</strong> {order.returnReason}
                    </div>
                  )}
                </div>

                {/* Animated Ticket Ripple Pass */}
                <div className="pt-2">
                  <AnimatedTicketCard
                    variant={order.paymentMethod === "Coinbase USDC" ? "coinbase_usdc" : order.paymentMethod === "Google Pay" ? "google_pay" : "startup_school"}
                    title={order.paymentMethod === "Coinbase USDC" ? "COINBASE USDC PAYMENT PASS" : order.paymentMethod === "Google Pay" ? "GOOGLE PAY ORDER TICKET" : "SPRESSO VIP ORDER PASS"}
                    subtitle={`ORDER #${order.id.substring(0, 8)}`}
                    attendeeName={order.userUid ? `UID: ${order.userUid.substring(0, 10)}` : "VIP CUSTOMER"}
                    location={order.items[0]?.product.name || "SPRESSO STORE"}
                    date={new Date(order.humanConfirmedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    ticketCode={`PASS-${order.id}`}
                  />
                </div>

                {/* Post-Purchase Agent Control Bar */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#f2f8f2]">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Delivery Reminder Button */}
                    <button
                      onClick={() => handleSetReminder(order.id)}
                      disabled={loadingAction === `reminder-${order.id}`}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                        isReminderSet
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-white text-[#386633] border border-[#d8ebd7] hover:bg-[#f2f8f2]"
                      }`}
                    >
                      <MaterialIcon icon={isReminderSet ? "notifications_active" : "notification_add"} size={16} />
                      <span>{isReminderSet ? "Arrival Reminder Set" : "Set Arrival Reminder"}</span>
                    </button>

                    {/* Google Wallet Save Pass Button */}
                    <GoogleWalletButton
                      passUrl={`https://pay.google.com/gp/v/save/eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzcHJlc3NvLXdhbGxldEBzcHJlc3NvLTU1NjFmLmlhbS5nc2VydmljZWFjY291bnQuY29tIiwiaWF0IjoxNzU0NzA1MjAwLCJwYXlsb2FkIjp7ImdlbmVyaWNPYmplY3RzIjpbeyJpZCI6IjMzODgwMDAwMDAwMjIzODcxOTIuc3ByZXNzb19vcmRlcl8${order.id}"}`}
                    />

                    {/* Initiate Return Button */}
                    {!isReturnRequested ? (
                      <button
                        onClick={() => setReturnModalOrderId(order.id)}
                        className="px-3.5 py-2 bg-white text-[#5e635f] border border-[#d8ebd7] hover:text-[#a84a32] hover:border-red-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                      >
                        <MaterialIcon icon="assignment_return" size={16} />
                        <span>Initiate Return</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1">
                        <MaterialIcon icon="pending_actions" size={16} />
                        <span>Return Processing</span>
                      </span>
                    )}

                    {/* Ask AI about this order */}
                    <button
                      onClick={() => onAskAI?.(`Where is my order ${order.id} right now?`)}
                      className="px-3.5 py-2 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] hover:bg-[#e8f3e8] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <MaterialIcon icon="auto_awesome" size={16} />
                      <span>Ask AI Concierge</span>
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-[#5e635f] font-mono uppercase block">Total Paid</span>
                    <span className="text-lg font-bold text-[#386633] font-mono">
                      ${order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {returnModalOrderId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#d8ebd7] shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-[#f2f8f2] pb-3">
              <div className="flex items-center space-x-2 text-[#386633]">
                <MaterialIcon icon="assignment_return" size={22} />
                <h3 className="text-base font-bold text-[#18211e]">Initiate Return ({returnModalOrderId})</h3>
              </div>
              <button
                onClick={() => setReturnModalOrderId(null)}
                className="text-[#5e635f] hover:text-[#18211e] cursor-pointer"
              >
                <MaterialIcon icon="close" size={20} />
              </button>
            </div>

            <p className="text-xs text-[#5e635f]">
              Our automated 30-day return policy applies. Select a reason below and a prepaid shipping label will be generated immediately.
            </p>

            <form onSubmit={handleInitiateReturnSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#18211e] block mb-1">Reason for Return</label>
                <select
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#f8faf8] border border-[#d8ebd7] rounded-xl text-xs text-[#18211e] focus:outline-none focus:border-[#386633]"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="Item sizing / fit issue">Item sizing or fit issue</option>
                  <option value="Item defective or damaged">Item defective or damaged</option>
                  <option value="Changed mind / no longer needed">Changed mind / no longer needed</option>
                  <option value="Item differed from description">Item differed from description</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOrderId(null)}
                  className="px-4 py-2 border border-[#d8ebd7] text-[#5e635f] text-xs font-bold rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!returnReason}
                  className="px-4 py-2 bg-[#386633] text-white text-xs font-bold rounded-xl hover:bg-[#2c5227] transition cursor-pointer disabled:opacity-50"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global AI Communication Input Bar */}
      <AIShopperInputBar
        onSend={(t, img) => onAskAI?.(t, img)}
        placeholder="Ask AI Assistant about order status, returns or support..."
        className="mt-6"
      />
    </div>
  );
};
