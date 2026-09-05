import assert from "node:assert/strict";
import test from "node:test";
import { createOperationalReads } from "../src/operationalReads";

test("reads user-scoped travel, grocery, vision, and recipe records without invented defaults", async () => {
  const reads: string[] = [];
  const fixtures: Record<string, unknown> = {
    "users/user-123/trips": [{ id: "trip-1", title: "Oslo" }],
    "users/user-123/trips/trip-1/events": [{ id: "event-1", title: "Train" }],
    "users/user-123/trips/trip-1/expenses": [{ id: "expense-1", amount: 19.5 }],
    "users/user-123/trips/trip-1/voiceNotes": [{ id: "note-1", transcript: "Platform 4" }],
    "users/user-123/groceryLists/default/items": [{ id: "item-1", productName: "Coffee" }],
    "users/user-123/visionDetections/detection-1": { id: "detection-1", detectedName: "Grinder" },
    "users/user-123/recipes/pour-over": { id: "pour-over", productName: "Pour over" },
  };
  const repository = createOperationalReads({
    readCollection: async (path) => {
      reads.push(path);
      return (fixtures[path] as Record<string, unknown>[] | undefined) ?? [];
    },
    readDocument: async (path) => {
      reads.push(path);
      return (fixtures[path] as Record<string, unknown> | undefined) ?? null;
    },
  });

  assert.deepEqual(await repository.getTravelTrips("user-123"), [{ id: "trip-1", title: "Oslo" }]);
  assert.deepEqual(await repository.getTravelEvents("user-123", "trip-1"), [{ id: "event-1", title: "Train" }]);
  assert.deepEqual(await repository.getTravelExpenses("user-123", "trip-1"), [{ id: "expense-1", amount: 19.5 }]);
  assert.deepEqual(await repository.getVoiceNotes("user-123", "trip-1"), [{ id: "note-1", transcript: "Platform 4" }]);
  assert.deepEqual(await repository.getGroceryItems("user-123", "default"), [{ id: "item-1", productName: "Coffee" }]);
  assert.deepEqual(await repository.getVisionDetection("user-123", "detection-1"), { id: "detection-1", detectedName: "Grinder" });
  assert.deepEqual(await repository.getSavedRecipe("user-123", "pour-over"), { id: "pour-over", productName: "Pour over" });
  assert.deepEqual(reads, Object.keys(fixtures));
});

test("rejects path injection before a database read", async () => {
  const repository = createOperationalReads({
    readCollection: async () => assert.fail("database must not be read"),
    readDocument: async () => assert.fail("database must not be read"),
  });

  await assert.rejects(repository.getTravelEvents("user-123", "../other-user"), /Invalid trip ID/);
  await assert.rejects(repository.getGroceryItems("user-123", "bad/list"), /Invalid grocery list ID/);
});
