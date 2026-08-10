import { describe, expect, it } from "vitest";
import { buildXlsx } from "./xlsx.js";

describe("dependency-free XLSX writer", () => {
  it("writes a valid ZIP signature, formulas, and excludes the totals row from filtering", () => {
    const workbook = buildXlsx({
      title: "Register",
      headers: ["SL.NO", "MS"],
      rows: [[1, 8]],
      totalsRow: ["TOTALS", { formula: "SUM(B4:B4)" }],
    });
    const raw = workbook.toString("utf8");
    expect(workbook.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(raw).toContain('<autoFilter ref="A3:B4"/>');
    expect(raw).toContain("SUM(B4:B4)");
  });
});
