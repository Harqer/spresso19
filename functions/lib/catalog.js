"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTravelTrips = exports.getInventoryProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const dataconnect_1 = require("./dataconnect"); // Generated Admin SDK
exports.getInventoryProxy = (0, https_1.onCall)(async (request) => {
    // Products are discovered via web search, so we assume they are available.
    // This proxy returns the structural payload expected by the Kotlin client.
    if (!request.auth) {
        throw new Error("Unauthenticated: User must be logged in to check inventory.");
    }
    // You could integrate real-time web search validation here if necessary.
    // For now, products found via AI discovery are assumed in-stock.
    return {
        inventoryConfirmed: true,
        stockRemaining: 10
    };
});
exports.getTravelTrips = (0, https_1.onCall)(async (request) => {
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