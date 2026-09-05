import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ProductItemSchema,
  OrderItemSchema,
  OrderRecordSchema,
  AddToCartSchema,
} from "../lib/schema";

test("ProductItemSchema rejects a product missing required fields", () => {
  assert.equal(ProductItemSchema.safeParse({ id: "p1" }).success, false);
});

test("ProductItemSchema accepts a complete product", () => {
  const product = {
    id: "p1",
    name: "Item",
    price: 12.5,
    image: "https://example.com/img.png",
    category: "apparel",
  };
  assert.equal(ProductItemSchema.safeParse(product).success, true);
});

test("OrderItemSchema rejects a negative quantity", () => {
  const product = {
    id: "p1",
    name: "Item",
    price: 12.5,
    image: "https://example.com/img.png",
    category: "apparel",
  };
  assert.equal(OrderItemSchema.safeParse({ product, quantity: -1 }).success, false);
});

test("OrderRecordSchema requires a valid known status", () => {
  const base = {
    id: "o1",
    status: "NOT_A_STATUS",
    totalAmount: 10,
    items: [],
  };
  assert.equal(OrderRecordSchema.safeParse(base).success, false);
});

test("OrderRecordSchema accepts a CONFIRMED order", () => {
  const order = {
    id: "o1",
    status: "CONFIRMED",
    totalAmount: 10,
    items: [],
  };
  assert.equal(OrderRecordSchema.safeParse(order).success, true);
});

test("AddToCartSchema rejects a missing product id", () => {
  assert.equal(AddToCartSchema.safeParse({ quantity: 1 }).success, false);
});