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
  returnStatus: text('return_status'),
  returnReason: text('return_reason'),
  reminderSet: boolean('reminder_set').default(false),
  reminderTime: text('reminder_time'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.uid],
  }),
}));
