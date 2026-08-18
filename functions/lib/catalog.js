"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryProxy = void 0;
const https_1 = require("firebase-functions/v2/https");
const dataconnect_1 = require("./dataconnect"); // Generated Admin SDK
exports.getInventoryProxy = (0, https_1.onCall)(async (request) => {
    var _a;
    // Proxy for WasmJS clients to execute Data Connect queries
    if (!request.auth) {
        throw new Error("Unauthenticated: User must be logged in to access the catalog proxy.");
    }
    try {
        const response = await (0, dataconnect_1.listProducts)();
        return {
            products: ((_a = response.data) === null || _a === void 0 ? void 0 : _a.products) || []
        };
    }
    catch (error) {
        throw new Error("Failed to fetch inventory from Data Connect: " + error.message);
    }
});
//# sourceMappingURL=catalog.js.map