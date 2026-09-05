import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../shared/db";

export type AiBudgetKind = "chat" | "search" | "research" | "media" | "outfit";

const BUDGETS: Record<AiBudgetKind, number> = {
  chat: 60,
  search: 30,
  research: 5,
  media: 8,
  outfit: 10,
};

const CACHE_TTLS_SECONDS: Record<string, number> = {
  productSearch: 15 * 60,
  productResearch: 6 * 60 * 60,
  media: 24 * 60 * 60,
  referenceData: 60 * 60,
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).sort().join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

export function cacheKey(namespace: string, value: unknown): string {
  return createHash("sha256")
    .update(`${namespace}:${stableJson(value)}`)
    .digest("hex");
}

function cacheCollection(namespace: string) {
  return db.collection("aiCache").doc(namespace).collection("entries");
}

export async function getCached<T>(namespace: string, key: string): Promise<T | undefined> {
  const snapshot = await cacheCollection(namespace).doc(key).get();
  if (!snapshot.exists) return undefined;
  const data = snapshot.data();
  const expiresAt = data?.expiresAt as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
    void cacheCollection(namespace).doc(key).delete().catch((error) =>
      console.warn("AI cache cleanup failed", { namespace, error: error instanceof Error ? error.message : "unknown" }),
    );
    return undefined;
  }
  return data?.value as T | undefined;
}

export async function setCached<T>(namespace: string, key: string, value: T, ttlSeconds = CACHE_TTLS_SECONDS[namespace] ?? 900): Promise<void> {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, "utf8") > 900_000) {
    console.warn("AI cache skipped because the result is too large", { namespace });
    return;
  }
  const safeValue = JSON.parse(serialized) as T;
  await cacheCollection(namespace).doc(key).set({
    value: safeValue,
    expiresAt: Timestamp.fromMillis(Date.now() + ttlSeconds * 1000),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function withCache<T>(
  namespace: string,
  input: unknown,
  producer: () => Promise<T>,
  ttlSeconds?: number,
): Promise<{ value: T; cacheHit: boolean }> {
  const key = cacheKey(namespace, input);
  const cached = await getCached<T>(namespace, key);
  if (cached !== undefined) return { value: cached, cacheHit: true };
  const value = await producer();
  await setCached(namespace, key, value, ttlSeconds);
  return { value, cacheHit: false };
}

export async function consumeBudget(uid: string, kind: AiBudgetKind): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const ref = db.collection("aiBudgets").doc(`${uid}_${day}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = Number(snapshot.data()?.[kind] ?? 0);
    if (current >= BUDGETS[kind]) {
      throw new Error(`Daily ${kind} limit reached`);
    }
    transaction.set(ref, {
      uid,
      day,
      [kind]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

export function budgetLimit(kind: AiBudgetKind): number {
  return BUDGETS[kind];
}
