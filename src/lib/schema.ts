import { z } from "zod";

// Shared Schemas for validation across frontend and backend

// Orders
export const ProductItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  price: z.number(),
  currency: z.string().optional(),
  image: z.string(),
  category: z.string(),
  description: z.string().optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  fitNotes: z.string().optional(),
  availabilityStatus: z.enum(["UNKNOWN", "VERIFY_AT_MERCHANT_CHECKOUT", "AVAILABLE", "UNAVAILABLE"]).optional(),
  sku: z.string().optional(),
  rating: z.number().optional(),
  reviews: z.number().optional(),
  tags: z.array(z.string()).optional(),
  virtualTryOnEligible: z.boolean().optional(),
  mcpServerId: z.string().optional()
});

export const OrderItemSchema = z.object({
  product: ProductItemSchema,
  quantity: z.number().int().positive().max(25),
  selectedColor: z.string().optional(),
  selectedSize: z.string().optional()
});

export const OrderRecordSchema = z.object({
  id: z.string(),
  status: z.enum(["CONFIRMED", "IN_TRANSIT", "DELIVERED", "RETURN_REQUESTED", "REFUNDED"]),
  totalAmount: z.number(),
  items: z.array(OrderItemSchema),
  humanConfirmedAt: z.string().optional(),
  userUid: z.string().optional(),
  reminderSet: z.boolean().optional(),
  returnStatus: z.string().optional(),
  returnReason: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingStatus: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  carrier: z.string().optional(),
  paymentMethod: z.string().optional(),
  mcpTransactionHash: z.string().optional(),
  deviceSource: z.string().optional(),
  shippingAddress: z.string().optional()
});

export const AddToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive()
});

export const GetOrdersResponseSchema = z.object({
  success: z.boolean(),
  orders: z.array(OrderRecordSchema).optional(),
  error: z.string().optional()
});

// AI & Wardrobe
export const AiOutfitItemSchema = z.object({
  fitName: z.string(),
  stylingNotes: z.string(),
  items: z.array(z.string()),
  season: z.string().optional()
});

export const SeasonalStylingResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    curatedFits: z.array(AiOutfitItemSchema)
  }).optional(),
  error: z.string().optional()
});

export const GenerateOutfitResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    title: z.string().optional(),
    stylingAdvice: z.string().optional(),
    selectedItemIds: z.array(z.string()).optional(),
    weatherMatchScore: z.number().optional()
  }).optional(),
  error: z.string().optional()
});
