import { onCall } from "firebase-functions/v2/https";
import { getTrips } from "./dataconnect"; // Generated Admin SDK

export const getInventoryProxy = onCall(async (request) => {
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

export const getTravelTrips = onCall(async (request) => {
    if (!request.auth) {
        throw new Error("Unauthenticated: User must be logged in to fetch travel trips.");
    }
    
    try {
        const response = await getTrips();
        const trips = response.data?.trips || [];
        
        // Map to match the frontend expectations (snake_case/camelCase keys)
        const mappedTrips = trips.map((t: any) => ({
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
    } catch (error: any) {
        throw new Error("Failed to fetch trips from Data Connect: " + error.message);
    }
});
