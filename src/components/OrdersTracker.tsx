import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OrderRecord } from "../types";
import { MaterialIcon } from "./MaterialIcon";
import { AIShopperInputBar } from "./AIShopperInputBar";
import { GoogleWalletButton } from "@/src/components/features/profile/GoogleWalletButton";
import { ErrorStateFallback, EmptyStateFallback } from "./shared/Fallbacks";
import { GetOrdersResponseSchema } from "../lib/schema";
import { AnimatedTicketCard } from "./features/orders/AnimatedTicketCard";

interface OrdersTrackerProps {
  orders: OrderRecord[];
  onAskAI?: (text: string, image?: string | null) => void;
  onRefreshOrders?: () => void;
}

export const OrdersTracker: React.FC<OrdersTrackerProps> = ({ orders, onAskAI, onRefreshOrders }) => {
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [liveOrders, setLiveOrders] = useState<OrderRecord[]>(orders);
  const queryClient = useQueryClient();

  const { data: queryOrders, isLoading: isQueryLoading } = useQuery({
    queryKey: ["userOrders"],
    queryFn: async () => {
      const getUserOrders = httpsCallable(functions, "getUserOrders");
      const res = await getUserOrders();
      const parsedData = GetOrdersResponseSchema.parse(res.data);
      if (parsedData.success && parsedData.orders) {
        return parsedData.orders as OrderRecord[];
      }
      return [];
    }
  });

  const isLoading = isQueryLoading;

  useEffect(() => {
    if (queryOrders) {
      setLiveOrders(queryOrders);
    }
  }, [queryOrders]);
  const [returnReason, setReturnReason] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const showSuccess = (message: string) => {
    setActionErrorMsg(null);
    setActionSuccessMsg(message);
    window.setTimeout(() => setActionSuccessMsg(null), 5000);
  };

  const handleSetReminder = async (orderId: string) => {
    setLoadingAction(`reminder-${orderId}`);
    setActionErrorMsg(null);
    try {
      const setOrderReminder = httpsCallable(functions, "setOrderReminder");
      const res = await setOrderReminder({ orderId, reminderTime: "Today at 5:00 PM (Arrival Alert)" });
      const data = res.data as any;
      if (data.success) {
        showSuccess(`We’ll remind you when order ${orderId} is close.`);
        queryClient.invalidateQueries({ queryKey: ["userOrders"] });
        if (onRefreshOrders) onRefreshOrders();
      } else {
        setActionErrorMsg("Unable to set the arrival reminder right now. Please try again.");
      }
    } catch {
      setActionErrorMsg("I couldn’t set that reminder. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleInitiateReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalOrderId) return;

    setLoadingAction(`return-${returnModalOrderId}`);
    setActionErrorMsg(null);
    try {
      const initiateOrderReturn = httpsCallable(functions, "initiateOrderReturn");
      const res = await initiateOrderReturn({
        orderId: returnModalOrderId,
        reason: returnReason || "Customer return request",
        idempotencyKey: crypto.randomUUID(),
      });
      const data = res.data as any;
      if (data.success) {
        showSuccess(`Your return for ${returnModalOrderId} has been started.`);
        setReturnModalOrderId(null);
        setReturnReason("");
        queryClient.invalidateQueries({ queryKey: ["userOrders"] });
        if (onRefreshOrders) onRefreshOrders();
      } else {
        setActionErrorMsg("Unable to initiate the return right now. Please try again.");
      }
    } catch {
      setActionErrorMsg("I couldn’t start that return. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddToWallet = async (orderId: string) => {
    setLoadingAction(`wallet-${orderId}`);
    setActionErrorMsg(null);
    try {
      const generatePass = httpsCallable(functions, "generateGoogleWalletPassJwt");
      const response = await generatePass({ orderId });
      const jwt = (response.data as { jwt?: unknown }).jwt;
      if (typeof jwt !== "string" || jwt.length === 0) throw new Error("Missing Wallet pass");
      window.location.assign(`https://pay.google.com/gp/v/save/${encodeURIComponent(jwt)}`);
    } catch {
      setActionErrorMsg("I couldn’t prepare the Wallet pass. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const getStatusText = (order: OrderRecord) => {
    if (order.status === "RETURN_REQUESTED" || order.returnStatus === "REQUESTED") {
      return { icon: "undo", label: "Return requested", color: "text-amber-700" };
    }
    if (order.status === "DELIVERED") {
      return { icon: "mark_email_read", label: "Delivered", color: "text-emerald-700" };
    }
    if (order.status === "IN_TRANSIT") {
      return { icon: "local_shipping", label: "In transit", color: "text-blue-700" };
    }
    return {
      icon: "check_circle",
      label: order.status.toLowerCase().replace(/_/g, " "),
      color: "text-[#386633]",
    };
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
              <h2 className="text-xl font-bold text-[#18211e] font-headline">Your orders</h2>
              <p className="text-xs text-[#5e635f] mt-0.5">
                Track deliveries, set reminders, and start a return when you need to.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-[#386633] flex items-center space-x-1.5">
              <MaterialIcon icon="smart_toy" size={16} />
              <span>Ask Spresso anytime</span>
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
      {actionErrorMsg && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold flex items-center space-x-2">
          <MaterialIcon icon="error" size={18} />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-[#d8ebd7] text-center text-[#5e635f] space-y-3 shadow-xs">
          <div className="w-12 h-12 border-4 border-[#386633] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-[#18211e]">Loading Live Orders...</h3>
        </div>
      ) : queryOrders?.length === undefined && liveOrders.length === 0 && !isLoading && queryClient.getQueryState(["userOrders"])?.status === "error" ? (
        <ErrorStateFallback
          title="Orders Unavailable"
          message="We could not fetch your live order history. Please check your connection."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ["userOrders"] })}
        />
      ) : liveOrders.length === 0 ? (
        <EmptyStateFallback
          title="No Orders Placed Yet"
          description="Start chatting or browse the catalog to make your first purchase."
        />
      ) : (
        <div className="space-y-4">
          {liveOrders.map(order => {
            const isReminderSet = order.reminderSet;
            const isReturnRequested = order.status === "RETURN_REQUESTED" || order.returnStatus === "REQUESTED";
            const status = getStatusText(order);

            return (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-[#d8ebd7] shadow-xs space-y-5 text-[#18211e]"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f2f8f2] pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-[#18211e] font-mono">{order.id}</span>
                    <span className={`text-xs font-semibold flex items-center space-x-1 ${status.color}`}>
                      <MaterialIcon icon={status.icon} size={14} />
                      <span className="capitalize">{status.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-[#5e635f] font-mono">
                    <span className="flex items-center space-x-1">
                      <MaterialIcon icon="schedule" size={16} />
                      <span>{order.humanConfirmedAt ? new Date(order.humanConfirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Time unavailable"}</span>
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
                          Qty: {item.quantity} • Unit Price: {item.product.listing?.observedPrice ? new Intl.NumberFormat(undefined, { style: "currency", currency: item.product.listing.observedPrice.currency }).format(item.product.listing.observedPrice.amount) : "Price at merchant"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-[#386633] font-mono shrink-0">
                        {item.product.listing?.observedPrice ? new Intl.NumberFormat(undefined, { style: "currency", currency: item.product.listing.observedPrice.currency }).format(item.product.listing.observedPrice.amount * item.quantity) : "Price at merchant"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Live Logistics & Tracking Widget */}
                <div className="p-4 bg-[#f2f8f2] border border-[#d8ebd7] rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <MaterialIcon icon="local_shipping" size={20} className="text-[#386633]" />
                      <span className="text-xs font-bold text-[#18211e]">Delivery tracking</span>
                    </div>
                    {order.carrier && (
                      <span className="text-[11px] font-mono text-[#5e635f] font-bold">
                        {order.carrier}{order.trackingNumber ? ` • ${order.trackingNumber}` : ""}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-[#d8ebd7]">
                      <span className="text-[10px] text-[#5e635f] font-bold uppercase block">Current Location / Status</span>
                      <span className="font-semibold text-[#18211e]">
                        {order.trackingStatus || "Tracking details aren’t available yet."}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#d8ebd7]">
                      <span className="text-[10px] text-[#5e635f] font-bold uppercase block">Estimated Arrival</span>
                      <span className="font-bold text-[#386633] font-mono">
                        {order.estimatedDelivery || "Waiting for the carrier"}
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
                    date={order.humanConfirmedAt ? new Date(order.humanConfirmedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "DATE UNAVAILABLE"}
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
                      onClick={() => handleAddToWallet(order.id)}
                      className={loadingAction === `wallet-${order.id}` ? "opacity-60 pointer-events-none" : ""}
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
                      <span className="px-1 text-amber-800 text-xs font-semibold flex items-center space-x-1">
                        <MaterialIcon icon="pending_actions" size={16} />
                        <span>Return in progress</span>
                      </span>
                    )}

                    {/* Ask AI about this order */}
                    <button
                      onClick={() => onAskAI?.(`Where is my order ${order.id} right now?`)}
                      className="px-3.5 py-2 bg-[#f2f8f2] text-[#386633] border border-[#d8ebd7] hover:bg-[#e8f3e8] rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <MaterialIcon icon="auto_awesome" size={16} />
                      <span>Ask Spresso</span>
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
        placeholder="Ask about an order, delivery, or return..."
        className="mt-6"
      />
    </div>
  );
};
