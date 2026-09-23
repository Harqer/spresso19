import { describe, expect, test } from "vitest";
import { climateCategory, temperatureDisplay, WEATHER_FETCH_TIMEOUT_MS } from "./http";

// climateCategory is the season mapping that drives wardrobe outfit context.
// The 10/25 seams are the product decision; the tests pin them.
describe("climateCategory", () => {
  test("freezing cold maps to Winter", () => {
    expect(climateCategory(-15.5)).toBe("Winter");
  });

  test("just below 10°C is Winter (boundary exclusive, matching the pre-bridge client logic)", () => {
    expect(climateCategory(9.9)).toBe("Winter");
  });

  test("exactly 10°C is Occasion (only strictly-colder counts as Winter)", () => {
    expect(climateCategory(10)).toBe("Occasion");
  });

  test("just above 10°C is Occasion", () => {
    expect(climateCategory(10.1)).toBe("Occasion");
  });

  test("exactly 25°C is Occasion", () => {
    expect(climateCategory(25)).toBe("Occasion");
  });

  test("just above 25°C is Summer", () => {
    expect(climateCategory(25.1)).toBe("Summer");
  });

  test("extreme heat maps to Summer", () => {
    expect(climateCategory(48)).toBe("Summer");
  });
});

describe("temperatureDisplay", () => {
  test("rounds to one decimal place", () => {
    expect(temperatureDisplay(21.44)).toBe("21.4°C");
    expect(temperatureDisplay(21.46)).toBe("21.5°C");
  });

  test("whole temperatures render without a decimal", () => {
    expect(temperatureDisplay(21)).toBe("21°C");
  });

  test("negative temperatures keep their sign", () => {
    expect(temperatureDisplay(-3.27)).toBe("-3.3°C");
  });
});

test("weather provider timeout is bounded", () => {
  // A wedged provider fetch must not hold the action until Convex's action limit.
  expect(WEATHER_FETCH_TIMEOUT_MS).toBeGreaterThan(0);
  expect(WEATHER_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
});
