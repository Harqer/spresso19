import { db } from "../../shared/db";
import type { MediaJob, MediaJobStore } from "./mediaGateway";

function documentId(requesterUid: string, idempotencyKey: string): string {
  return `${requesterUid}_${idempotencyKey}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 1_000);
}

function collection() {
  return db.collection("mediaJobs");
}

export function createFirestoreMediaJobStore(): MediaJobStore {
  return {
    async getByIdempotency(requesterUid, idempotencyKey) {
      const snapshot = await collection().doc(documentId(requesterUid, idempotencyKey)).get();
      return snapshot.exists ? snapshot.data() as MediaJob : undefined;
    },
    async create(job) {
      await collection().doc(documentId(job.requesterUid, job.idempotencyKey)).create({ ...job, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
    async update(jobId, patch) {
      const snapshot = await collection().where("jobId", "==", jobId).limit(1).get();
      if (snapshot.empty) throw new Error("Media job not found");
      await snapshot.docs[0].ref.set({ ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    },
    async getByJobId(jobId) {
      const snapshot = await collection().where("jobId", "==", jobId).limit(1).get();
      return snapshot.empty ? undefined : snapshot.docs[0].data() as MediaJob;
    },
  };
}
