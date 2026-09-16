import { randomUUID } from "node:crypto";
import { z } from "zod";

const MediaTypeSchema = z.enum(["image", "video"]);
const MediaResultSchema = z.object({
  mediaUrl: z.union([
    z.string().url().refine((value) => value.startsWith("https://")),
    z.string().regex(/^data:(?:image\/(?:png|jpeg|webp)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+=*$/i),
  ]),
  mediaType: MediaTypeSchema,
  safety: z.enum(["approved", "rejected"]),
}).strict();

export type MediaRequest = {
  prompt: string;
  mediaType: "image" | "video";
  imageUrls?: string[];
  requesterUid: string;
  idempotencyKey: string;
};

export type MediaJob = {
  jobId: string;
  requesterUid: string;
  idempotencyKey: string;
  prompt: string;
  mediaType: "image" | "video";
  imageUrls: string[];
  provider: string;
  status: "queued" | "running" | "retrying" | "completed" | "failed";
  mediaUrl?: string;
  errorCode?: "provider_failure" | "provider_exhausted" | "unsafe_result" | "invalid_result";
};

export type MediaProviderAdapter = {
  /** Ordered by production preference. Each adapter must perform the real capability. */
  provider: string;
  generate(input: Omit<MediaRequest, "idempotencyKey">): Promise<unknown>;
};

export type MediaJobStore = {
  getByIdempotency(requesterUid: string, idempotencyKey: string): Promise<MediaJob | undefined>;
  create(job: MediaJob): Promise<void>;
  update(jobId: string, patch: Partial<MediaJob>): Promise<void>;
  getByJobId(jobId: string): Promise<MediaJob | undefined>;
};

export class MediaGatewayError extends Error {
  constructor(message = "Media generation is unavailable right now.") {
    super(message);
    this.name = "MediaGatewayError";
  }
}

/**
 * Providers use this error when they can classify a failure at their boundary.
 * Policy/business/input failures are never bypassed by another provider.
 */
export class MediaProviderError extends Error {
  readonly fallbackEligible: boolean;
  readonly code: "outage" | "timeout" | "rate_limited" | "invalid_response" | "policy_denied" | "auth" | "invalid_input" | "business_rule";

  constructor(code: MediaProviderError["code"], fallbackEligible: boolean, message = "Media provider request failed.") {
    super(message);
    this.name = "MediaProviderError";
    this.code = code;
    this.fallbackEligible = fallbackEligible;
  }
}

class MediaPolicyError extends MediaGatewayError {
  constructor() {
    super("Media generation was blocked by safety policy.");
    this.name = "MediaPolicyError";
  }
}

class MediaInvalidResultError extends MediaGatewayError {
  constructor(message = "Media generation returned an invalid result.") {
    super(message);
    this.name = "MediaInvalidResultError";
  }
}

function validateRequest(input: MediaRequest): MediaRequest {
  if (!input || typeof input !== "object") throw new MediaGatewayError();
  if (typeof input.prompt !== "string" || input.prompt.trim().length < 1 || input.prompt.length > 4_000) throw new MediaGatewayError();
  if (!MediaTypeSchema.safeParse(input.mediaType).success) throw new MediaGatewayError();
  if (typeof input.requesterUid !== "string" || input.requesterUid.trim().length === 0) throw new MediaGatewayError();
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.trim().length < 8 || input.idempotencyKey.length > 200) throw new MediaGatewayError();
  const imageUrls = input.imageUrls ?? [];
  if (!Array.isArray(imageUrls) || imageUrls.length > 4 || imageUrls.some((url) => typeof url !== "string" || !url.startsWith("https://") || url.length > 2_048)) throw new MediaGatewayError();
  return { ...input, prompt: input.prompt.trim(), imageUrls };
}

function normalizedOutput(result: unknown, requestedType: MediaRequest["mediaType"]): { mediaUrl: string; mediaType: MediaRequest["mediaType"] } {
  const parsed = MediaResultSchema.safeParse(result);
  if (!parsed.success) throw new MediaInvalidResultError();
  if (parsed.data.safety !== "approved") throw new MediaPolicyError();
  if (parsed.data.mediaType !== requestedType) throw new MediaInvalidResultError("Media generation returned the wrong media type.");
  if (parsed.data.mediaUrl.startsWith("data:") && !parsed.data.mediaUrl.startsWith(`data:${requestedType}/`)) {
    throw new MediaInvalidResultError("Media generation returned the wrong media type.");
  }
  return { mediaUrl: parsed.data.mediaUrl, mediaType: parsed.data.mediaType };
}

function classifyFailure(error: unknown): { fallbackEligible: boolean; policyDenied: boolean; invalidResult: boolean } {
  if (error instanceof MediaPolicyError) return { fallbackEligible: false, policyDenied: true, invalidResult: false };
  if (error instanceof MediaInvalidResultError) return { fallbackEligible: true, policyDenied: false, invalidResult: true };
  if (error instanceof MediaProviderError) return {
    fallbackEligible: error.fallbackEligible,
    policyDenied: !error.fallbackEligible && ["policy_denied", "auth", "invalid_input", "business_rule"].includes(error.code),
    invalidResult: error.code === "invalid_response",
  };
  // An unclassified provider exception is treated as a technical provider
  // failure. It can use the bounded retry/next-provider path, never success.
  return { fallbackEligible: true, policyDenied: false, invalidResult: false };
}

export class MediaGateway {
  private readonly store: MediaJobStore;
  private readonly providers: readonly MediaProviderAdapter[];
  private readonly retryDelayMs: number;
  private readonly pending = new Map<string, Promise<void>>();

  constructor(options: { store: MediaJobStore; providers: readonly MediaProviderAdapter[]; retryDelayMs?: number }) {
    this.store = options.store;
    this.providers = options.providers.filter((candidate) => typeof candidate.provider === "string" && candidate.provider.trim().length > 0);
    this.retryDelayMs = Math.max(0, options.retryDelayMs ?? 250);
  }

  async submitMediaJob(input: MediaRequest): Promise<Pick<MediaJob, "jobId" | "provider" | "status">> {
    const request = validateRequest(input);
    const existing = await this.store.getByIdempotency(request.requesterUid, request.idempotencyKey);
    // Submission is an acknowledgement that durable work was accepted. The
    // asynchronous provider state is observable only through pollMediaJob.
    if (existing) return { jobId: existing.jobId, provider: existing.provider, status: "queued" };
    const provider = this.providers[0];
    if (!provider) throw new MediaGatewayError();
    const job: MediaJob = {
      jobId: randomUUID(),
      requesterUid: request.requesterUid,
      idempotencyKey: request.idempotencyKey,
      prompt: request.prompt,
      mediaType: request.mediaType,
      imageUrls: request.imageUrls ?? [],
      provider: provider.provider,
      status: "queued",
    };
    try {
      await this.store.create(job);
    } catch {
      const raced = await this.store.getByIdempotency(request.requesterUid, request.idempotencyKey);
      if (raced) return { jobId: raced.jobId, provider: raced.provider, status: raced.status };
      throw new MediaGatewayError();
    }
    const work = this.process(job, request);
    this.pending.set(job.jobId, work);
    void work.then(
      () => { if (this.pending.get(job.jobId) === work) this.pending.delete(job.jobId); },
      () => { if (this.pending.get(job.jobId) === work) this.pending.delete(job.jobId); },
    );
    return { jobId: job.jobId, provider: job.provider, status: "queued" };
  }

  async pollMediaJob(jobId: string): Promise<Pick<MediaJob, "jobId" | "provider" | "status" | "mediaUrl">> {
    const job = await this.store.getByJobId(jobId);
    if (!job) throw new MediaGatewayError();
    return { jobId: job.jobId, provider: job.provider, status: job.status, mediaUrl: job.mediaUrl };
  }

  async waitForIdle(jobId: string): Promise<void> {
    await this.pending.get(jobId);
  }

  private async process(job: MediaJob, request: MediaRequest): Promise<void> {
    let lastWasInvalid = false;
    for (let providerIndex = 0; providerIndex < this.providers.length; providerIndex += 1) {
      const provider = this.providers[providerIndex];
      await this.store.update(job.jobId, {
        provider: provider.provider,
        status: providerIndex === 0 ? "running" : "retrying",
      });
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const output = normalizedOutput(await provider.generate({
            prompt: request.prompt,
            mediaType: request.mediaType,
            imageUrls: request.imageUrls,
            requesterUid: request.requesterUid,
          }), request.mediaType);
          await this.store.update(job.jobId, { status: "completed", provider: provider.provider, mediaUrl: output.mediaUrl });
          return;
        } catch (error) {
          const failure = classifyFailure(error);
          if (failure.policyDenied) {
            await this.store.update(job.jobId, { status: "failed", errorCode: "unsafe_result" });
            return;
          }
          lastWasInvalid = failure.invalidResult;
          if (!failure.fallbackEligible) {
            await this.store.update(job.jobId, { status: "failed", errorCode: "provider_failure" });
            return;
          }
          if (attempt < 3 && this.retryDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * attempt));
          }
        }
      }
    }
    await this.store.update(job.jobId, {
      status: "failed",
      errorCode: lastWasInvalid ? "invalid_result" : "provider_exhausted",
    });
  }
}
