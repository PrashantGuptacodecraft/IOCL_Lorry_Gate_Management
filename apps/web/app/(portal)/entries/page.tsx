"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { EntryStatus, GateEntryRecord } from "@iocl/shared";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { DEMO_MODE, downloadCsv, listEntries } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { formatIndiaDate, formatIndiaTime } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { PageHeader } from "../../../components/ui/page-header";

const PAGE_SIZE = 20;

export default function EntriesPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GateEntryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EntryStatus | "">("");
  const [match, setMatch] = useState<"all" | "matched" | "mismatched">("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const canExport = user?.role === "SUPERVISOR" || user?.role === "ADMIN";

  useEffect(() => setPage(1), [search, status, match]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void listEntries({ search: search || undefined, status: status || undefined, match, page, pageSize: PAGE_SIZE })
        .then((result) => {
          if (!active) return;
          setEntries(result.items);
          setTotal(result.total);
          setTotalPages(result.totalPages);
        })
        .catch((reason) => {
          if (!active) return;
          const message = reason instanceof Error ? reason.message : "Records could not be loaded";
          setError(message);
          setEntries([]);
        })
        .finally(() => active && setLoading(false));
    }, 220);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, status, match, page, reload]);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCsv({ search: search || undefined, status: status || undefined, match });
      toast.success("CSV export downloaded");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "CSV export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Today's operations"
        title="Today’s Gate Records"
        description="Search today’s authorized IN and OUT movements. Security roles see only the records allowed by their gate assignment."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {canExport ? (
              <Button
                type="button"
                variant="secondary"
                loading={exporting}
                disabled={DEMO_MODE}
                title={DEMO_MODE ? "CSV export is enabled in the connected production build" : undefined}
                onClick={() => void exportCsv()}
                icon={<Download className="h-5 w-5" />}
              >
                Export CSV
              </Button>
            ) : null}
            {user?.role !== "EXIT_GATE_SECURITY" ? <Link href="/entries/new"><Button icon={<Plus className="h-5 w-5" />}>New IN Entry</Button></Link> : <Link href="/out"><Button icon={<Truck className="h-5 w-5" />}>Process Vehicle OUT</Button></Link>}
          </div>
        }
      />

      <div className="panel mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input pl-12"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search truck, driver, crew ID, token or destination..."
              aria-label="Search today's records"
            />
          </div>
          <div className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select className="field-input appearance-none pl-11" value={status} onChange={(event) => setStatus(event.target.value as EntryStatus | "")} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="IN">Currently IN</option>
              <option value="OUT">Exited</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <select className="field-input" value={match} onChange={(event) => setMatch(event.target.value as typeof match)} aria-label="Filter by TT match">
            <option value="all">All TT verification</option>
            <option value="matched">TT matched</option>
            <option value="mismatched">TT mismatch</option>
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{loading ? "Loading records…" : `${total} record${total === 1 ? "" : "s"} found`}</span>
          {DEMO_MODE && canExport ? <span className="font-semibold text-orange-700">Export activates with PostgreSQL mode</span> : null}
        </div>
      </div>

      {error ? (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <Button type="button" variant="secondary" onClick={() => setReload((value) => value + 1)} icon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[1.05fr_1fr_1fr_.85fr_.8fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 lg:grid">
          <span>Serial / Vehicle</span><span>Driver / Crew</span><span>Destination</span><span>Time In</span><span>Verification</span><span />
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse bg-gradient-to-r from-white via-slate-50 to-white" />) : null}
          {!loading && entries.map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`} className="group grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[1.05fr_1fr_1fr_.85fr_.8fr_auto] lg:items-center lg:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-iocl-navy transition group-hover:bg-orange-50 group-hover:text-iocl-orange"><Truck className="h-5 w-5" /></span>
                <div><p className="font-black tracking-wide text-iocl-navy">{entry.actualTankTruckNumber}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{entry.displaySerial}</p></div>
              </div>
              <div><p className="text-sm font-bold text-slate-800">{entry.driverName}</p><p className="mt-0.5 text-xs text-slate-500">{entry.crewId}</p></div>
              <div><p className="text-sm font-semibold text-slate-700">{entry.customerDestination}</p><p className="mt-0.5 text-xs text-slate-400">Token {entry.mobileTokenNumber}</p></div>
              <div><p className="text-sm font-bold text-slate-700">{formatIndiaTime(entry.timeIn)}</p><p className="mt-0.5 text-xs text-slate-400">{formatIndiaDate(entry.timeIn)}</p></div>
              <div className="flex flex-wrap gap-2"><Badge tone={entry.ttNumberMatch ? "green" : "red"}>{entry.ttNumberMatch ? "Matched" : "TT Mismatch"}</Badge><Badge tone={entry.status === "IN" ? "blue" : "slate"}>{entry.status}</Badge></div>
              <ChevronRight className="hidden h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-iocl-orange lg:block" />
            </Link>
          ))}
          {!loading && entries.length === 0 ? (
            <div className="px-6 py-16 text-center"><AlertTriangle className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-600">No matching IN entries</p><p className="mt-1 text-sm text-slate-400">Change the filters or create a new entry.</p></div>
          ) : null}
        </div>

        {!loading && totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
            <p className="text-xs font-semibold text-slate-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="min-h-10 px-3" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} icon={<ChevronLeft className="h-4 w-4" />}>Previous</Button>
              <Button type="button" variant="secondary" className="min-h-10 px-3" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
