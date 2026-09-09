import { describe, expect, test } from "vitest";
import { isTrialActive, trialWindow, TRIAL_DURATION_MS } from "./trial";

describe("14-day trial", () => {
  test("derives a deterministic two-week window", () => {
    const window = trialWindow(1_000);
    expect(window).toEqual({ startedAt: 1_000, endsAt: 1_000 + TRIAL_DURATION_MS });
    expect(isTrialActive(window, window.endsAt - 1)).toBe(true);
    expect(isTrialActive(window, window.endsAt)).toBe(false);
  });

  test("preserves an explicitly stored window", () => {
    expect(trialWindow(1_000, 2_000, 3_000)).toEqual({ startedAt: 2_000, endsAt: 3_000 });
  });
});
