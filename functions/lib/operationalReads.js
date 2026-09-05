"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationalReads = createOperationalReads;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
function requireSafeId(value, label) {
    if (!SAFE_ID.test(value))
        throw new Error(`Invalid ${label} ID`);
    return value;
}
function createOperationalReads(adapter) {
    const userPath = (uid) => `users/${requireSafeId(uid, "user")}`;
    const tripPath = (uid, tripId) => `${userPath(uid)}/trips/${requireSafeId(tripId, "trip")}`;
    return {
        async getTravelTrips(uid) {
            return adapter.readCollection(`${userPath(uid)}/trips`);
        },
        async getTravelEvents(uid, tripId) {
            return adapter.readCollection(`${tripPath(uid, tripId)}/events`);
        },
        async getTravelExpenses(uid, tripId) {
            return adapter.readCollection(`${tripPath(uid, tripId)}/expenses`);
        },
        async getVoiceNotes(uid, tripId) {
            return adapter.readCollection(`${tripPath(uid, tripId)}/voiceNotes`);
        },
        async getGroceryItems(uid, listId) {
            return adapter.readCollection(`${userPath(uid)}/groceryLists/${requireSafeId(listId, "grocery list")}/items`);
        },
        async getVisionDetection(uid, detectionId) {
            return adapter.readDocument(`${userPath(uid)}/visionDetections/${requireSafeId(detectionId, "detection")}`);
        },
        async getSavedRecipe(uid, recipeId) {
            return adapter.readDocument(`${userPath(uid)}/recipes/${requireSafeId(recipeId, "recipe")}`);
        },
    };
}
//# sourceMappingURL=operationalReads.js.map