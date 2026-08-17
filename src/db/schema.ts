import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // References Firebase UID
  totalAmount: numeric('total_amount').notNull(),
  status: text('status').notNull(),
  deviceSource: text('device_source'),
  items: text('items'), // serialized JSON array
  vendorId: text('vendor_id'),
  vendorOrderRef: text('vendor_order_ref'),
  fulfillmentType: text('fulfillment_type'),
  reminderSet: boolean('reminder_set').default(false),
  reminderTime: text('reminder_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const trips = pgTable('trips', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  destination: text('destination'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  status: text('status').default('UPCOMING'),
  coverImage: text('cover_image'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const itineraryEvents = pgTable('itinerary_events', {
  id: serial('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  type: text('type').notNull(), // flight, hotel, restaurant, tour, ticket
  title: text('title').notNull(),
  description: text('description'),
  eventTime: text('event_time'),
  location: text('location'),
  price: numeric('price'),
  qrData: text('qr_data'),
  confirmationCode: text('confirmation_code'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const travelExpenses = pgTable('travel_expenses', {
  id: serial('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  userId: text('user_id').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('USD'),
  category: text('category').notNull(),
  merchant: text('merchant').notNull(),
  receiptImageUrl: text('receipt_image_url'),
  date: text('date'),
  items: text('items'), // JSON stringified line items
  createdAt: timestamp('created_at').defaultNow(),
});

export const voiceNotes = pgTable('voice_notes', {
  id: serial('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  userId: text('user_id').notNull(),
  transcript: text('transcript').notNull(),
  audioUrl: text('audio_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  isDefault: boolean('is_default').default(false),
  stripePaymentMethodId: text('stripe_payment_method_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  tier: text('tier').default('VIP Member'),
  status: text('status').default('active'),
  currentPeriodEnd: text('current_period_end'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  theme: text('theme').default('dark'),
  pushNotifications: boolean('push_notifications').default(true),
  emailAlerts: boolean('email_alerts').default(true),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  trips: many(trips),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.uid],
  }),
}));
