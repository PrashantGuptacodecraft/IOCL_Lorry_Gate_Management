"use client";

import Link from "next/link";
import { useState } from "react";
import type { ExitResolveResult, GateEntryRecord } from "@iocl/shared";
import { CheckCircle2, ClipboardCheck, FileText, RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { toast } from "sonner";
import { resolveExitInvoice, submitExit } from "../../../lib/api";
import { formatIndiaDate, formatIndiaTime } from "../../../lib/utils";
import { InvoiceScanner } from "../../../components/entry/invoice-scanner";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { PageHeader } from "../../../components/ui/page-header";

// Products matching the physical logbook columns (image shows: MS, XP 95, HSD, SKO, XG, BIO HSD, FO, LDO)
const PRODUCTS = [
  { key: "qtyMs",     label: "MS",      fullName: "Bulk MS (Motor Spirit)"   },
  { key: "qtyXpms",  label: "XP 95",   fullName: "XP 95 (Extra Premium)"    },
  { key: "qtyHsd",   label: "HSD",     fullName: "Bulk HSD (High Speed Diesel)" },
  { key: "qtySko",   label: "SKO",     fullName: "SKO (Superior Kerosene)"  },
  { key: "qtyXg",    label: "XG",      fullName: "XG (Xtra Green)"          },
  { key: "qtyBioHsd",label: "BIO HSD", fullName: "Bio HSD"                  },
  { key: "qtyFo",    label: "FO",      fullName: "FO (Furnace Oil)"         },
  { key: "qtyLdo",   label: "LDO",     fullName: "LDO (Light Diesel Oil)"   },
  { key: "qtyEbms",  label: "EBMS",    fullName: "EBMS"                     },
] as const;

type ProductKey = typeof PRODUCTS[number]["key"];
type Quantities = Record<ProductKey, string>;

const zeroQuantities: Quantities = {
  qtyMs: "", qtyXpms: "", qtyHsd: "", qtySko: "",
  qtyXg: "", qtyBioHsd: "", qtyFo: "", qtyLdo: "", qtyEbms: "",
};

export default function OutGatePage() {
  const [rawQr, setRawQr]           = useState("");
  const [resolved, setResolved]     = useState<ExitResolveResult | null>(null);
  const [quantities, setQuantities] = useState<Quantities>(zeroQuantities);
  const [lockNumber, setLockNumber] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [completed, setCompleted]   = useState<GateEntryRecord | null>(null);

  async function resolve(raw: string) {
    setLoading(true); setResolved(null); setCompleted(null);
    setAcknowledged(false); setQuantities(zeroQuantities); setLockNumber(""); setRawQr(raw);
    try {
      const result = await resolveExitInvoice(raw);
      setResolved(result);
      toast.success("Matching open IN record found");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoice could not be resolved");
    } finally { setLoading(false); }
  }

  async function completeExit() {
    if (!resolved) return;
    const values = Object.fromEntries(
      PRODUCTS.map(({ key }) => [key, quantities[key] === "" ? 0 : Number(quantities[key])])
    ) as Record<ProductKey, number>;
    if (Object.values(values).some((v) => !Number.isFinite(v) || v < 0))
      return toast.error("Enter valid non-negative quantities");
    if (Object.values(values).every((v) => v === 0))
      return toast.error("Enter at least one product quantity");
    if (resolved.warnings.length > 0 && !acknowledged)
      return toast.error("Acknowledge the warnings before confirming exit");
    setLoading(true);
    try {
      const result = await submitExit(resolved.entry.id, {
        rawInvoiceQr: rawQr,
        expectedVersion: resolved.entry.recordVersion,
        ...values,
        lockNumber,
        warningsAcknowledged: acknowledged,
      });
      setCompleted(result);
      toast.success("Vehicle OUT completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Exit could not be completed");
    } finally { setLoading(false); }
  }

  function reset() {
    setRawQr(""); setResolved(null); setCompleted(null);
    setAcknowledged(false); setQuantities(zeroQuantities); setLockNumber("");
  }

  // ── Completed screen ─────────────────────────────────────────────────────
  if (completed) {
    const totalMs  = Number(completed.qtyMs  ?? 0);
    const totalHsd = Number(completed.qtyHsd ?? 0);
    const totalXp  = Number(completed.qtyXpms ?? 0);
    return (
      <div className="mx-auto max-w-3xl">
        <div className="panel overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-10 text-white text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
              <CheckCircle2 className="h-11 w-11" />
            </span>
            <p className="mt-5 text-xs font-extrabold uppercase tracking-[.2em] text-emerald-100">Exit successfully recorded</p>
            <h1 className="mt-2 text-3xl font-black">{completed.actualTankTruckNumber}</h1>
            <p className="mt-2 text-sm text-emerald-100">
              {completed.displaySerial} · OUT at {completed.timeOut ? formatIndiaTime(completed.timeOut) : "—"}
            </p>
          </div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-4">
            <Summary label="Invoice No"   value={completed.invoiceNumber  ?? "—"} />
            <Summary label="Consignee"    value={completed.invoiceConsignee ?? "—"} />
            <Summary label="MS"           value={`${totalMs} L`} />
            <Summary label="HSD"          value={`${totalHsd} L`} />
          </div>
          <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
            <Button type="button" onClick={reset} icon={<RefreshCw className="h-5 w-5" />}>Process Next Exit</Button>
            <Link href={`/entries/${completed.id}`}>
              <Button type="button" variant="secondary" className="w-full">View Locked Record</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ─────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        eyebrow="OUT Gate Security"
        title="Invoice QR & Vehicle Exit"
        description="Scan the dispatch invoice, match it to today's open IN record, enter product quantities, and confirm vehicle OUT."
      />

      {!resolved ? (
        <section className="panel p-5 sm:p-7">
          <InvoiceScanner onDetected={resolve} loading={loading} />
        </section>
      ) : (
        <div className="space-y-5">
          {/* ── Invoice & IN-record summary ─────────────────────────────── */}
          <section className="panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-iocl-orange">Invoice matched</p>
                <h2 className="mt-1 text-xl font-black text-iocl-navy">{resolved.entry.actualTankTruckNumber}</h2>
              </div>
              <div className="flex gap-2">
                <Badge tone="blue">IN record found</Badge>
                <Badge tone={resolved.entry.ttNumberMatch ? "green" : "red"}>
                  {resolved.entry.ttNumberMatch ? "TT matched" : "TT mismatch"}
                </Badge>
              </div>
            </div>
            <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-4">
              <Summary label="Invoice Number"        value={resolved.invoice.invoiceNumber} />
              <Summary label="Invoice Date"          value={formatIndiaDate(resolved.invoice.invoiceDate)} />
              <Summary label="Vehicle in Invoice"    value={resolved.invoice.vehicleNumber} />
              <Summary label="Invoice Value"         value={resolved.invoice.invoiceValue ? `₹${Number(resolved.invoice.invoiceValue).toLocaleString("en-IN")}` : "Not provided"} />
              <Summary label="Consignee"             value={resolved.invoice.consignee} />
              <Summary label="Product / Qty (raw)"   value={resolved.invoice.productQuantityRaw} />
              <Summary label="Driver"                value={resolved.entry.driverName} />
              <Summary label="Time IN"               value={formatIndiaTime(resolved.entry.timeIn)} />
            </div>
          </section>

          {/* ── Warnings ──────────────────────────────────────────────── */}
          {resolved.warnings.length > 0 && (
            <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
              <div className="flex gap-3">
                <ShieldAlert className="h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-black">Review warnings before exit</h2>
                  {resolved.warnings.map((w) => <p key={w} className="mt-1 text-sm">• {w}</p>)}
                </div>
              </div>
              <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-amber-300 bg-white px-4">
                <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                <span className="text-sm font-bold">I reviewed these warnings and authorize the exit submission</span>
              </label>
            </section>
          )}

          {/* ── Product quantities ────────────────────────────────────── */}
          <section className="panel p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ClipboardCheck className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-iocl-navy">Product Quantities & Exit Details</h2>
                <p className="text-xs text-slate-500">Enter quantities from the dispatch invoice. Leave unused products as 0.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {/* Lock Number — full width */}
              <label className="sm:col-span-2 xl:col-span-3">
                <span className="field-label">Lock Number</span>
                <input
                  type="text"
                  className="field-input text-lg font-black uppercase"
                  value={lockNumber}
                  onChange={(e) => setLockNumber(e.target.value)}
                  placeholder="Optional — enter new lock number"
                />
              </label>

              {/* Product quantity inputs */}
              {PRODUCTS.map(({ key, label, fullName }) => (
                <label key={key}>
                  <span className="field-label">{label} <span className="font-normal text-slate-400">({fullName})</span></span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      className="field-input pr-10 text-lg font-black"
                      value={quantities[key]}
                      onChange={(e) => setQuantities((cur) => ({ ...cur, [key]: e.target.value }))}
                      placeholder="0"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">L</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Live total */}
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-700">Total loaded</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">
                {PRODUCTS.reduce((sum, { key }) => sum + (Number(quantities[key]) || 0), 0).toFixed(3)} L
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={reset}>Scan Different Invoice</Button>
              <Button type="button" loading={loading} onClick={() => void completeExit()} icon={<Truck className="h-5 w-5" />}>
                Confirm Vehicle OUT
              </Button>
            </div>
          </section>

          <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <FileText className="h-5 w-5 shrink-0" />
            <p>OUT submission auto-stamps Time Out, stores the invoice snapshot, records the operator, and writes an audit log. Security users can no longer edit the completed movement; administrators may make audited corrections when required.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-iocl-navy">{value}</p>
    </div>
  );
}
