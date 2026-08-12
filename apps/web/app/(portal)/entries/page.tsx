"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GateEntryRecord } from "@iocl/shared";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Clock3,
  Download,
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

function useEntriesPanel(status: "IN" | "OUT") {
  const [entries, setEntries] = useState<GateEntryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void listEntries({ search: search || undefined, status, page: 1, pageSize: 50 })
        .then((result) => { if (active) { setEntries(result.items); } })
        .catch((reason) => { if (active) { setError(reason instanceof Error ? reason.message : "Failed to load"); setEntries([]); } })
        .finally(() => active && setLoading(false));
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, status, reload]);

  return { entries, search, setSearch, loading, error, reload: () => setReload((v) => v + 1) };
}

function EntryRow({ entry }: { entry: GateEntryRecord }) {
  const isIn = entry.status === "IN";
  return (
    <Link
      href={`/entries/${entry.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-orange-200 hover:bg-orange-50"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIn ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"} transition group-hover:bg-iocl-orange group-hover:text-white`}>
        <Truck className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black tracking-wide text-iocl-navy">{entry.actualTankTruckNumber}</p>
        <p className="truncate text-xs text-slate-500">{entry.driverName} · {entry.customerDestination}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
          <Clock3 className="h-3 w-3" />
          <span>{formatIndiaTime(entry.timeIn)}</span>
          {entry.timeOut ? <><span>→</span><span>{formatIndiaTime(entry.timeOut)}</span></> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone={entry.ttNumberMatch ? "green" : "red"}>{entry.ttNumberMatch ? "Match" : "Mismatch"}</Badge>
        <p className="text-[10px] font-bold text-slate-400">{entry.displaySerial}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-iocl-orange" />
    </Link>
  );
}

function Panel({
  title, icon, accentColor, entries, search, onSearch, loading, error, onReload, emptyText,
}: {
  title: string; icon: React.ReactNode; accentColor: string;
  entries: GateEntryRecord[]; search: string; onSearch: (v: string) => void;
  loading: boolean; error: string | null; onReload: () => void; emptyText: string;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 ${accentColor}`}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white">{icon}</span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-white/70">Today</p>
          <p className="text-base font-black text-white">{title}</p>
        </div>
        <span className="ml-auto flex h-8 min-w-8 items-center justify-center rounded-xl bg-white/20 px-2.5 text-sm font-black text-white">
          {loading ? "…" : entries.length}
        </span>
      </div>

      {/* Search */}
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input py-2.5 pl-10 text-sm"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Truck, driver, destination…"
          />
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="m-3 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</div>
          <Button type="button" variant="secondary" onClick={onReload} icon={<RefreshCw className="h-3.5 w-3.5" />}>Retry</Button>
        </div>
      ) : null}

      {/* List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 320px)", minHeight: "200px" }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white" />)
          : entries.length === 0
          ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Truck className="h-10 w-10 text-slate-200" />
              <p className="mt-3 text-sm font-black text-slate-500">{emptyText}</p>
              <p className="mt-1 text-xs text-slate-400">Records update in real time</p>
            </div>
          )
          : entries.map((entry) => <EntryRow key={entry.id} entry={entry} />)
        }
      </div>
    </div>
  );
}

export default function EntriesPage() {
  const { user } = useAuth();
  const canExport = user?.role === "SUPERVISOR" || user?.role === "ADMIN";
  const [exporting, setExporting] = useState(false);

  const inPanel = useEntriesPanel("IN");
  const outPanel = useEntriesPanel("OUT");

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCsv({});
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
        title="Gate Records"
        description="Live view of today's Check-IN and Check-OUT movements. Click any record to view full details."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {canExport ? (
              <Button type="button" variant="secondary" loading={exporting} disabled={DEMO_MODE}
                title={DEMO_MODE ? "CSV export is enabled in the connected production build" : undefined}
                onClick={() => void exportCsv()} icon={<Download className="h-5 w-5" />}>
                Export CSV
              </Button>
            ) : null}
            {user?.role !== "EXIT_GATE_SECURITY"
              ? <Link href="/entries/new"><Button icon={<Plus className="h-5 w-5" />}>New IN Entry</Button></Link>
              : <Link href="/out"><Button icon={<Truck className="h-5 w-5" />}>Process Vehicle OUT</Button></Link>
            }
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* CHECK-IN PANEL */}
        <Panel
          title="Check-IN Records"
          icon={<ArrowDownToLine className="h-5 w-5" />}
          accentColor="bg-gradient-to-r from-blue-700 to-blue-500"
          entries={inPanel.entries}
          search={inPanel.search}
          onSearch={inPanel.setSearch}
          loading={inPanel.loading}
          error={inPanel.error}
          onReload={inPanel.reload}
          emptyText="No vehicles currently checked in"
        />

        {/* CHECK-OUT PANEL */}
        <Panel
          title="Check-OUT Records"
          icon={<ArrowUpFromLine className="h-5 w-5" />}
          accentColor="bg-gradient-to-r from-emerald-700 to-emerald-500"
          entries={outPanel.entries}
          search={outPanel.search}
          onSearch={outPanel.setSearch}
          loading={outPanel.loading}
          error={outPanel.error}
          onReload={outPanel.reload}
          emptyText="No vehicles have exited today"
        />
      </div>
    </div>
  );
}
