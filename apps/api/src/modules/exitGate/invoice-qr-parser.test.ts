import { describe, expect, it } from "vitest";
import { parseInvoiceQr } from "./invoice-qr-parser.js";

const sample = "Inv:0793356259 Dt:06.06.25 Val:1143122.00 Veh:TN59CL2839 Prd/Qty:BULK-MS/8;BULK-HSD/4 Con:203031(VASUGI AGENCIES)";

describe("invoice QR parser", () => {
  it("parses the supplied invoice QR format", () => {
    const result = parseInvoiceQr(sample);
    expect(result.invoiceNumber).toBe("0793356259");
    expect(result.vehicleNumber).toBe("TN59CL2839");
    expect(result.invoiceDateIso).toBe("2025-06-06");
    expect(result.productQuantityRaw).toContain("BULK-MS/8");
  });
  it("rejects missing and duplicate labels", () => {
    expect(() => parseInvoiceQr(sample.replace(/\sCon:.+$/, ""))).toThrow();
    expect(() => parseInvoiceQr(`${sample} Inv:123`)).toThrow();
  });
  it("rejects an impossible invoice date", () => expect(() => parseInvoiceQr(sample.replace("06.06.25", "31.02.25"))).toThrow());

  it("rejects unsupported years and values beyond database precision", () => {
    expect(() => parseInvoiceQr(sample.replace("06.06.25", "06.06.1999"))).toThrow(/unsupported year/);
    expect(() => parseInvoiceQr(sample.replace("1143122.00", "123456789012345.00"))).toThrow(/database precision/);
  });
});
