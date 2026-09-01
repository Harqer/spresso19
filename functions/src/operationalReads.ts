export type OperationalReadAdapter = {
  readCollection(path: string): Promise<Record<string, unknown>[]>;
  readDocument(path: string): Promise<Record<string, unknown> | null>;
};

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function requireSafeId(value: string, label: string): string {
  if (!SAFE_ID.test(value)) throw new Error(`Invalid ${label} ID`);
  return value;
}

export function createOperationalReads(adapter: OperationalReadAdapter) {
  const userPath = (uid: string) => `users/${requireSafeId(uid, "user")}`;
  const tripPath = (uid: string, tripId: string) =>
    `${userPath(uid)}/trips/${requireSafeId(tripId, "trip")}`;

  return {
    async getTravelTrips(uid: string) {
      return adapter.readCollection(`${userPath(uid)}/trips`);
    },
    async getTravelEvents(uid: string, tripId: string) {
      return adapter.readCollection(`${tripPath(uid, tripId)}/events`);
    },
    async getTravelExpenses(uid: string, tripId: string) {
      return adapter.readCollection(`${tripPath(uid, tripId)}/expenses`);
    },
    async getVoiceNotes(uid: string, tripId: string) {
      return adapter.readCollection(`${tripPath(uid, tripId)}/voiceNotes`);
    },
    async getGroceryItems(uid: string, listId: string) {
      return adapter.readCollection(
        `${userPath(uid)}/groceryLists/${requireSafeId(listId, "grocery list")}/items`,
      );
    },
    async getVisionDetection(uid: string, detectionId: string) {
      return adapter.readDocument(
        `${userPath(uid)}/visionDetections/${requireSafeId(detectionId, "detection")}`,
      );
    },
    async getSavedRecipe(uid: string, recipeId: string) {
      return adapter.readDocument(`${userPath(uid)}/recipes/${requireSafeId(recipeId, "recipe")}`);
    },
  };
}
