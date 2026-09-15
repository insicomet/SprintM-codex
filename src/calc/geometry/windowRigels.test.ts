import { describe, expect, it } from "vitest";
import { getWindowRigelProfiles, isWindowRigelType, selectWindowRigel, windowRigelFactors } from "./windowRigels";

describe("window rigel Excel factors", () => {
  it("matches Лист1!I34:L38", () => {
    expect([1, 2, 3, 4, 5].map((type) => windowRigelFactors(type as 1 | 2 | 3 | 4 | 5))).toEqual([
      { type: 1, moment: 0.125, length: 1, deflection: 1 },
      { type: 2, moment: 0.055, length: 5 / 6, deflection: 0.13 },
      { type: 3, moment: 0.062, length: 0.33, deflection: 0.24 },
      { type: 4, moment: 0.078, length: 0.5, deflection: 0.5 },
      { type: 5, moment: 0.073, length: 0.75, deflection: 0.2 },
    ]);
  });

  it("accepts only the five workbook schemes", () => {
    expect([1, 2, 3, 4, 5].every(isWindowRigelType)).toBe(true);
    expect(isWindowRigelType(0)).toBe(false);
    expect(isWindowRigelType(6)).toBe(false);
    expect(isWindowRigelType(1.5)).toBe(false);
  });

  it("uses real profile masses from the checked-in workbook-derived catalog", () => {
    const profiles = getWindowRigelProfiles();
    expect(profiles.some((p) => p.name === "кв.80х3" && p.massPerM_kg === 7.2)).toBe(true);
    expect(profiles.some((p) => p.name === "кв.80х4" && p.massPerM_kg === 9.6)).toBe(true);
  });

  it("selects a real candidate instead of a fixed 80x4 constant", () => {
    const selection = selectWindowRigel({
      type: 2, height_m: 1, framePitch_m: 6, verticalLoad_kPa: 0.42, windLoad_kPa: 0.44,
    });
    expect(selection).not.toBeNull();
    expect(selection?.profile.name).toMatch(/^кв\.|^пр\./);
    expect(selection?.profile.massPerM_kg).toBeGreaterThan(0);
  });
});
