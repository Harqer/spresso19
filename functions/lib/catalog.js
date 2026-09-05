"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTravelTrips = exports.fetchProductsByIds = void 0;
exports.normalizeProductIds = normalizeProductIds;
const https_1 = require("firebase-functions/v2/https");
const dataconnect_1 = require("./dataconnect"); // Generated Admin SDK
const db_1 = require("./shared/db");
function normalizeProductIds(values, max = 50) {
    if (!Array.isArray(values))
        throw new Error("Product IDs are required.");
    const ids = values.filter((value) => typeof value === "string")
        .map(value => value.trim()).filter(Boolean);
    const unique = [...new Set(ids)];
    if (unique.length > max)
        throw new Error("Too many product IDs requested.");
    return unique;
}
exports.fetchProductsByIds = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    let ids;
    try {
        ids = normalizeProductIds((_a = request.data) === null || _a === void 0 ? void 0 : _a.productIds);
    }
    catch (error) {
        throw new https_1.HttpsError("invalid-argument", error instanceof Error ? error.message : "Product IDs are invalid.");
    }
    if (ids.length === 0)
        return { listings: [] };
    const snapshots = await Promise.all(ids.map(id => db_1.db.collection("discovered_listings").doc(id).get()));
    return {
        listings: snapshots.filter(snapshot => snapshot.exists).map(snapshot => (Object.assign({ id: snapshot.id }, snapshot.data()))),
    };
});
exports.getTravelTrips = (0, https_1.onCall)({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new Error("Unauthenticated: User must be logged in to fetch travel trips.");
    }
    try {
        const response = await (0, dataconnect_1.getTrips)();
        const trips = ((_a = response.data) === null || _a === void 0 ? void 0 : _a.trips) || [];
        // Map to match the frontend expectations (snake_case/camelCase keys)
        const mappedTrips = trips.map((t) => ({
            id: t.id,
            title: t.title,
            destination: t.destination || "",
            start_date: t.startDate || "",
            end_date: t.endDate || "",
            status: t.status || "UPCOMING",
            cover_image: t.coverImage || "",
            budget_total: "0.0", // Schema doesn't have budget, frontend handles double parsing
            spent_total: "0.0"
        }));
        return { trips: mappedTrips };
    }
    catch (error) {
        throw new Error("Failed to fetch trips from Data Connect: " + error.message);
    }
});
//# sourceMappingURL=catalog.js.map