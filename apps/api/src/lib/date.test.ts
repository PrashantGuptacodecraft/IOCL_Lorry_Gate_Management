import { describe, expect, it } from "vitest";
import { formatDisplaySerial, getBusinessDate } from "./date.js";

describe("business date", () => {
  it("uses Asia/Kolkata when UTC is still on the previous day", () => {
    const result = getBusinessDate(new Date("2026-08-04T19:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-08-05T00:00:00.000Z");
  });

  it("formats a stable daily serial", () => {
    expect(formatDisplaySerial(new Date("2026-08-05T00:00:00.000Z"), 7)).toBe("IN-20260805-0007");
  });
});
