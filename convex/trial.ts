export const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export type TrialWindow = { startedAt: number; endsAt: number };

export function trialWindow(createdAt: number, startedAt?: number, endsAt?: number): TrialWindow {
  const start = Number.isFinite(startedAt) ? Number(startedAt) : createdAt;
  const end = Number.isFinite(endsAt) ? Number(endsAt) : start + TRIAL_DURATION_MS;
  return { startedAt: start, endsAt: end };
}

export function isTrialActive(window: TrialWindow, now = Date.now()): boolean {
  return now < window.endsAt;
}
