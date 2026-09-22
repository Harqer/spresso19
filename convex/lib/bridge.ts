import type { Id, TableNames } from "../_generated/dataModel";
import type { ListingSnapshot } from "./listing";

export class BridgeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const CONVEX_ID_MAX_LENGTH = 64;

export function requireConvexId<TableName extends TableNames>(
  value: string,
  fieldName: string,
): Id<TableName> {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > CONVEX_ID_MAX_LENGTH || /\s/.test(trimmed)) {
    throw new BridgeError(`Invalid ${fieldName}.`, 400);
  }
  return trimmed as Id<TableName>;
}

const EXPENSE_CATEGORIES = [
  "Dining",
  "Flight",
  "Hotel",
  "Shopping",
  "Transport",
  "Activities",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export function requireExpenseCategory(value: string): ExpenseCategory {
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(value)) {
    throw new BridgeError("Unsupported expense category.", 400);
  }
  return value as ExpenseCategory;
}

export function requireListingSnapshot(value: unknown): ListingSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BridgeError("A listing snapshot is required.", 400);
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.merchantUrl !== "string") {
    throw new BridgeError("Listing snapshot is missing required fields.", 400);
  }
  return value as ListingSnapshot;
}

export function optionalListingSnapshot(value: unknown): ListingSnapshot | undefined {
  if (value === undefined || value === null) return undefined;
  return requireListingSnapshot(value);
}
