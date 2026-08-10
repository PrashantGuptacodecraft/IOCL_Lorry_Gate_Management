"use client";

import { useEffect, useState } from "react";
import type { AuditLogRecord } from "@iocl/shared";
import { FileClock, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { getAudits } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { formatIndiaDate, formatIndiaTime } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { PageHeader } from "../../../components/ui/page-header";

const actions = ["", "CREATE", "UPDATE", "EXIT", "LOGIN", "LOGIN_FAILED", "TOKEN_REFRESH", "LOGOUT"] as const;

export default function AuditPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<AuditLogRecord[]>([]);
  const [action, setAction] = useState<(typeof actions)[number]>("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const allowed = user?.role === "SUPERVISOR" || user?.role === "ADMIN";

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError(null);
    void getAudits({ action: action || undefined, limit: 100 })
      .then((data) => active && setItems(data))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "Audit trail could not be loaded"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [allowed, action, reload]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="panel p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500"><LockKeyhole className="h-8 w-8" /></span>
          <h1 className="mt-5 text-2xl font-black text-iocl-navy">Supervisor access required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Audit records contain security-sensitive before/after data and are restricted to authorized supervisory roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Security and accountability"
        title="Audit Trail"
        description="Create, update, exit and authentication activity recorded with actor, timestamp, request and record context."
        action={
          <select className="field-input min-w-52" value={action} onChange={(event) => setAction(event.target.value as typeof action)} aria-label="Filter audit action">
            <option value="">All actions</option>
            {actions.filter(Boolean).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        }
      />

      {error ? (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <span>{error}</span>
          <Button type="button" variant="secondary" onClick={() => setReload((value) => value + 1)} icon={<RefreshCw className="h-4 w-4" />}>Retry</Button>
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[160px_1fr_1fr_180px] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 md:grid"><span>Action</span><span>Actor</span><span>Record / Changes</span><span>Timestamp</span></div>
        <div className="divide-y divide-slate-100">
          {loading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-20 animate-pulse bg-gradient-to-r from-white via-slate-50 to-white" />) : null}
          {!loading && items.map((item) => (
            <div key={item.id} className="grid gap-3 px-5 py-5 md:grid-cols-[160px_1fr_1fr_180px] md:items-center md:px-6">
              <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-iocl-orange"><FileClock className="h-4 w-4" /></span><Badge tone={item.action === "CREATE" || item.action === "LOGIN" ? "green" : item.action === "LOGIN_FAILED" ? "red" : "orange"}>{item.action}</Badge></div>
              <div><p className="text-sm font-black text-iocl-navy">{item.actor?.name ?? "System User"}</p><p className="text-xs text-slate-400">{item.actor?.employeeCode ?? "—"} · {item.actorRole.replaceAll("_", " ")}</p></div>
              <div><p className="text-sm font-bold text-slate-700">{item.entityType ?? "GATE_ENTRY"}</p><p className="truncate text-xs text-slate-400">{item.entityId ?? "Authentication event"}</p>{item.changedFields?.length ? <p className="mt-1 truncate text-[11px] font-semibold text-orange-700">Changed: {item.changedFields.join(", ")}</p> : null}</div>
              <div><p className="text-sm font-bold text-slate-700">{formatIndiaTime(item.createdAt)}</p><p className="text-xs text-slate-400">{formatIndiaDate(item.createdAt)}</p></div>
            </div>
          ))}
          {!loading && items.length === 0 ? <div className="px-6 py-16 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-black text-slate-600">No audit events to display</p><p className="mt-1 text-sm text-slate-400">Change the filter or create/edit an entry.</p></div> : null}
        </div>
      </div>
    </div>
  );
}
