import { onCall } from "firebase-functions/v2/https";
import { listProducts } from "./dataconnect"; // Generated Admin SDK

export const getInventoryProxy = onCall(async (request) => {
    // Proxy for WasmJS clients to execute Data Connect queries
    if (!request.auth) {
        throw new Error("Unauthenticated: User must be logged in to access the catalog proxy.");
    }
    
    try {
        const response = await listProducts();
        return {
            products: response.data?.products || []
        };
    } catch (error: any) {
        throw new Error("Failed to fetch inventory from Data Connect: " + error.message);
    }
});
