import type { CrewPass } from "@iocl/shared";
import { CalendarDays, CheckCircle2, CreditCard, IdCard, LockKeyhole, ShieldCheck, Truck, UserRound } from "lucide-react";
import { Badge } from "../ui/badge";
import { formatIndiaDate, isExpired } from "../../lib/utils";

export function PassDetails({ pass }: { pass: CrewPass }) {
  const passExpired = isExpired(pass.passValidUntil);
  const licenceExpired = isExpired(pass.drivingLicenseExpiryDate);
  const warnings = Array.from(new Set([
    ...(pass.warnings ?? []),
    ...(passExpired ? ["Crew pass is expired"] : []),
    ...(licenceExpired ? ["Driving licence is expired"] : []),
  ]));
  const fields = [
    { label: "Crew ID", value: pass.crewId, icon: IdCard },
    { label: "Driver Name", value: pass.driverName, icon: UserRound },
    { label: "Crew Type", value: pass.crewType.replaceAll("_", " "), icon: ShieldCheck },
    { label: "TT Number on Pass", value: pass.ttNumberOnPass, icon: Truck },
    { label: "Driving Licence", value: pass.drivingLicenseNumber, icon: CreditCard },
    { label: "Pass Valid Until", value: formatIndiaDate(pass.passValidUntil), icon: CalendarDays, invalid: passExpired },
    { label: "Licence Expiry", value: formatIndiaDate(pass.drivingLicenseExpiryDate), icon: CalendarDays, invalid: licenceExpired },
  ];

  return (
    <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/55">
      <div className="flex flex-col gap-3 border-b border-emerald-200 bg-emerald-100/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
          <div>
            <p className="font-black text-emerald-950">Crew pass data extracted</p>
            <p className="flex items-center gap-1 text-xs text-emerald-700"><LockKeyhole className="h-3.5 w-3.5" /> Retrieved from scanned crew pass and locked</p>
          </div>
        </div>
        <Badge tone={warnings.length ? "red" : "green"}>{warnings.length ? "Attention required" : "Valid & active"}</Badge>
      </div>
      {warnings.length ? (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-800">
          {warnings.map((warning) => <p key={warning}>• {warning}</p>)}
        </div>
      ) : null}
      <div className="grid gap-px bg-emerald-100 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label} className="bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"><field.icon className="h-4 w-4" /> {field.label}</div>
            <p className={`mt-2 break-words text-sm font-black ${"invalid" in field && field.invalid ? "text-red-600" : "text-iocl-navy"}`}>{field.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
