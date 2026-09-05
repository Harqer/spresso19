"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheKey = cacheKey;
exports.getCached = getCached;
exports.setCached = setCached;
exports.withCache = withCache;
exports.consumeBudget = consumeBudget;
exports.budgetLimit = budgetLimit;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const db_1 = require("../shared/db");
const BUDGETS = {
    chat: 60,
    search: 30,
    research: 5,
    media: 8,
    outfit: 10,
};
const CACHE_TTLS_SECONDS = {
    productSearch: 15 * 60,
    productResearch: 6 * 60 * 60,
    media: 24 * 60 * 60,
    referenceData: 60 * 60,
};
function stableJson(value) {
    if (value === null || typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableJson).sort().join(",")}]`;
    return `{${Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
        .join(",")}}`;
}
function cacheKey(namespace, value) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(`${namespace}:${stableJson(value)}`)
        .digest("hex");
}
function cacheCollection(namespace) {
    return db_1.db.collection("aiCache").doc(namespace).collection("entries");
}
async function getCached(namespace, key) {
    const snapshot = await cacheCollection(namespace).doc(key).get();
    if (!snapshot.exists)
        return undefined;
    const data = snapshot.data();
    const expiresAt = data === null || data === void 0 ? void 0 : data.expiresAt;
    if (!expiresAt || expiresAt.toMillis() <= Date.now()) {
        void cacheCollection(namespace).doc(key).delete().catch((error) => console.warn("AI cache cleanup failed", { namespace, error: error instanceof Error ? error.message : "unknown" }));
        return undefined;
    }
    return data === null || data === void 0 ? void 0 : data.value;
}
async function setCached(namespace, key, value, ttlSeconds) {
    var _a;
    if (ttlSeconds === void 0) { ttlSeconds = (_a = CACHE_TTLS_SECONDS[namespace]) !== null && _a !== void 0 ? _a : 900; }
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, "utf8") > 900000) {
        console.warn("AI cache skipped because the result is too large", { namespace });
        return;
    }
    const safeValue = JSON.parse(serialized);
    await cacheCollection(namespace).doc(key).set({
        value: safeValue,
        expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + ttlSeconds * 1000),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
async function withCache(namespace, input, producer, ttlSeconds) {
    const key = cacheKey(namespace, input);
    const cached = await getCached(namespace, key);
    if (cached !== undefined)
        return { value: cached, cacheHit: true };
    const value = await producer();
    await setCached(namespace, key, value, ttlSeconds);
    return { value, cacheHit: false };
}
async function consumeBudget(uid, kind) {
    const day = new Date().toISOString().slice(0, 10);
    const ref = db_1.db.collection("aiBudgets").doc(`${uid}_${day}`);
    await db_1.db.runTransaction(async (transaction) => {
        var _a, _b;
        const snapshot = await transaction.get(ref);
        const current = Number((_b = (_a = snapshot.data()) === null || _a === void 0 ? void 0 : _a[kind]) !== null && _b !== void 0 ? _b : 0);
        if (current >= BUDGETS[kind]) {
            throw new Error(`Daily ${kind} limit reached`);
        }
        transaction.set(ref, {
            uid,
            day,
            [kind]: firestore_1.FieldValue.increment(1),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
}
function budgetLimit(kind) {
    return BUDGETS[kind];
}
//# sourceMappingURL=costControls.js.map