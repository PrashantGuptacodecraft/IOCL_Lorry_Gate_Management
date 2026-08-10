import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildQuantitySummary } from "./product-totals.js";

describe("register product grouping", () => {
  it("computes Petrol from MS, XPMS and EBMS and Diesel from HSD", () => {
    const result = buildQuantitySummary({
      qtyMs: new Prisma.Decimal("8"),
      qtyXpms: new Prisma.Decimal("2.5"),
      qtyEbms: new Prisma.Decimal("1.5"),
      qtyHsd: new Prisma.Decimal("4"),
    });
    expect(result).toEqual({
      ms: "8",
      xpms: "2.5",
      ebms: "1.5",
      hsd: "4",
      petrol: "12",
      diesel: "4",
    });
  });
});
