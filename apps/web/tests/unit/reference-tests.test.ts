import { describe, expect, test } from "vitest";

import { formatReferenceValue } from "@/components/sim/ReferenceTestsPanel";

describe("reference test display helpers", () => {
  test("formats controller objects without object-string leakage", () => {
    expect(formatReferenceValue({ kp: 0.35, ki: 0.06 })).toBe("kp 0.35, ki 0.06");
  });

  test("formats arrays and invalid numbers readably", () => {
    expect(formatReferenceValue([0.5, 0.8, 1.2])).toBe("0.5, 0.8, 1.2");
    expect(formatReferenceValue(Number.NaN)).toBe("N/A");
  });
});
