import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getTrips } from "./dataconnect"; // Generated Admin SDK
import { db } from "./shared/db";

export function normalizeProductIds(values: unknown, max = 50): string[] {
    if (!Array.isArray(values)) throw new Error("Product IDs are required.");
    const ids = values.filter((value): value is string => typeof value === "string")
        .map(value => value.trim()).filter(Boolean);
    const unique = [...new Set(ids)];
    if (unique.length > max) throw new Error("Too many product IDs requested.");
    return unique;
}

export const fetchProductsByIds = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Must be signed in.");
    let ids: string[];
    try {
        ids = normalizeProductIds(request.data?.productIds);
    } catch (error) {
        throw new HttpsError("invalid-argument", error instanceof Error ? error.message : "Product IDs are invalid.");
    }
    if (ids.length === 0) return { listings: [] };
    const snapshots = await Promise.all(ids.map(id => db.collection("discovered_listings").doc(id).get()));
    return {
        listings: snapshots.filter(snapshot => snapshot.exists).map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
    };
});

export const getTravelTrips = onCall({ enforceAppCheck: true, maxInstances: 20, minInstances: 0 }, async (request) => {
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
