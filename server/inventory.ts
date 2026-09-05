import type { ProductItem } from "../src/types";

export interface OrderItem {
  id: string;
  userId?: string;
  items: { product: any; quantity: number }[];
  totalAmount: number;
  status: "AUTHORIZED" | "PROCESSING" | "IN_TRANSIT" | "DELIVERED" | "RETURN_REQUESTED" | "RETURNED" | "CANCELLED";
  deviceSource: string;
  humanConfirmedAt: string;
  mcpTransactionHash: string;
  shippingAddress: string;
  trackingStatus?: string;
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  returnStatus?: "NONE" | "REQUESTED" | "APPROVED" | "COMPLETED";
  returnReason?: string;
  reminderSet?: boolean;
  reminderTime?: string;
}

export const activeOrders: OrderItem[] = [];

import { getDataConnect } from "firebase-admin/data-connect";
import { getApps, initializeApp } from "firebase-admin/app";
import { connectorConfig, listProducts } from "./dataconnect/esm/index.esm.js";

function getDc() {
  if (getApps().length === 0) {
    initializeApp({ projectId: "get-spresso" });
  }
  return getDataConnect(connectorConfig);
}

export async function getActiveProductById(id: string): Promise<any | undefined> {
  try {
    const result = await listProducts(getDc());
    const p = result?.data?.products?.find((item: any) => item.id === id || item.id_val === id);
    if (p) {
      return {
        id: p.id || p.id_val || id,
        name: p.name || "Spresso Product",
        brand: p.brand || "Spresso Store",
        category: p.category || "Apparel",
        price: typeof p.price === "number" ? p.price : parseFloat(p.price || "0"),
        image: p.imageUrl || p.image || "",
        description: p.description || "",
        likesCount: p.likesCount || 0,
        sku: p.sku || `SKU-${id}`,
        availabilityStatus: "VERIFY_AT_MERCHANT_CHECKOUT",
        currency: p.currency || "USD"
      };
    }
  } catch (dcErr: any) {
    console.warn("Failed to fetch product from Data Connect", dcErr.message);
  }
  return undefined; // Zero Mock - no fallback
}
