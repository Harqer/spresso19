import { ProductItem } from "../src/types.ts";

export const mockInventory: ProductItem[] = [
  {
    id: "mug",
    name: "Artisan Gradient Ceramic Mug",
    brand: "Nerelle Craft Studio",
    category: "Home & Craft",
    price: 48.00,
    currency: "USD",
    stock: 35,
    sku: "NER-ART-MUG-01",
    rating: 4.9,
    description: "An elegant artisan ceramic mug with a gradient glaze featuring a large, perfectly round, thick handle. Handmade studio craftsmanship.",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-craft-inventory-node"
  },
  {
    id: "colorful_mug",
    name: "Vibrant Hand-Painted Ceramic Mug",
    brand: "Atelier Mosaic",
    category: "Home & Craft",
    price: 52.00,
    currency: "USD",
    stock: 20,
    sku: "ATL-CLR-MUG-02",
    rating: 4.8,
    description: "A vibrant colorful hand-painted ceramic coffee mug on a clean surface. Studio product photography aesthetic.",
    image: "https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-craft-inventory-node"
  },
  {
    id: "perfume",
    name: "Nerelle Mineral Ornate Perfume Bottle",
    brand: "Nerelle Parfums",
    category: "Beauty & Fragrance",
    price: 185.00,
    currency: "USD",
    stock: 14,
    sku: "NER-PFM-SODALITE",
    rating: 5.0,
    description: "A luxury ornate glass perfume bottle called 'Nerelle'. Features real stone minerals, sodalite, and malachite accents.",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-beauty-inventory-node"
  },
  {
    id: "sneaker",
    name: "Sculptural Modular Running Sneaker",
    brand: "Aura Kinetic",
    category: "Sports Wear",
    price: 240.00,
    currency: "USD",
    stock: 18,
    sku: "AUR-SCULPT-SNK",
    rating: 4.9,
    description: "Premium luxury running sneakers with a sculptural modular sole and upper made out of suede nubuck leather and mesh panels.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-footwear-inventory-node"
  },
  {
    id: "prod-rayban-meta-01",
    name: "Meta Wayfarer Smart Glasses (Matte Black / G-15)",
    brand: "Ray-Ban x Meta",
    category: "Smart Wearables",
    price: 299.00,
    currency: "USD",
    stock: 42,
    sku: "RB-META-WAY-BLK",
    rating: 4.8,
    description: "Next-gen smart glasses with ultra-wide 12MP camera, open-ear audio, Meta AI voice assistant, and seamless photo capture.",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-rayban-retail-node"
  },
  {
    id: "prod-cyber-jacket-02",
    name: "Architectural Techwear Modular Parka",
    brand: "ACRONYM / OmniStudio",
    category: "Winter Wear",
    price: 450.00,
    currency: "USD",
    stock: 8,
    sku: "ACR-MOD-PARKA-01",
    rating: 4.9,
    description: "Waterproof Gore-Tex Pro shell with detachable magnetic sling, fidlock buckles, and augmented spatial HUD tag.",
    image: "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-apparel-logistics-node"
  },
  {
    id: "prod-creator-ring-04",
    name: "Oura Ring Gen4 Horizon Smart Ring",
    brand: "Oura",
    category: "Smart Wearables",
    price: 349.00,
    currency: "USD",
    stock: 25,
    sku: "OURA-GEN4-SILVER",
    rating: 5.0,
    description: "Precision titanium health ring with continuous sleep, HRV, body temperature, and stress telemetry.",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: false,
    mcpServerId: "mcp-wearable-node-04"
  },
  {
    id: "prod-synth-headphones-05",
    name: "Aura Spatial Wireless ANC Headphones",
    brand: "Aura Audio",
    category: "Electronics",
    price: 380.00,
    currency: "USD",
    stock: 15,
    sku: "AURA-ANC-SPATIAL",
    rating: 4.8,
    description: "Lossless spatial audio with head tracking, custom planar magnetic drivers, and active noise cancellation.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
    virtualTryOnEligible: true,
    mcpServerId: "mcp-audio-inventory-node"
  }
];

export interface OrderItem {
  id: string;
  userId?: string;
  items: { product: ProductItem; quantity: number }[];
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

export const activeOrders: OrderItem[] = [
  {
    id: "ORD-849201",
    userId: "guest_user",
    items: [
      {
        product: mockInventory[4], // Meta Wayfarer
        quantity: 1
      }
    ],
    totalAmount: 299.00,
    status: "IN_TRANSIT",
    deviceSource: "WEB",
    humanConfirmedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    mcpTransactionHash: "0xMCP_849201_METAWAY",
    shippingAddress: "123 Innovation Way, Tech District, SF",
    trackingStatus: "In Transit - On Delivery Vehicle",
    carrier: "FedEx Express",
    trackingNumber: "FX-9482019382",
    estimatedDelivery: "Today, 5:00 PM",
    returnStatus: "NONE",
    reminderSet: false
  }
];

export function getProductById(id: string): ProductItem | undefined {
  return mockInventory.find(p => p.id === id);
}
