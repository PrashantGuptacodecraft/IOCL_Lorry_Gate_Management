"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CrewPass, GateEntryRecord, CreateGateEntryInput, QrScanMethod } from "@iocl/shared";
import { createGateEntrySchema, IN_GATE_SAFETY_ITEMS } from "@iocl/shared";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, FileText, Info, Printer, RotateCcw, ScanLine, ShieldCheck, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { createEntry, getDestinations, resolvePass, type DestinationOption } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { formatIndiaDate, formatIndiaTime, isExpired, normalizeTruck } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { YesNoToggle } from "../ui/toggle";
import { PassDetails } from "./pass-details";
import { QRScanner } from "./qr-scanner";

const steps = [
  { title: "Scan & verify", icon: ScanLine },
  { title: "Vehicle details", icon: Truck },
  { title: "Safety check", icon: ShieldCheck },
  { title: "Review & submit", icon: ClipboardCheck },
];

const unsetBoolean = undefined as unknown as boolean;
const defaultValues: CreateGateEntryInput = {
  crewPassId: "",
  qrScanMethod: "CAMERA",
  customerDestination: "",
  actualTankTruckNumber: "",
  abs: unsetBoolean,
  challanNumber: "",
  driverPassNumber: "",
  driverAbt: unsetBoolean,
  helperName: "",
  helperPassNumber: "",
  helperAbt: unsetBoolean,
  mobileTokenNumber: "",
  driverSignatureConfirmed: false as unknown as true,
  remarks: "",
  safetyChecklist: {
    drivingLicenseValidCmvRule9: unsetBoolean,
    verifyRegisterColumn1: unsetBoolean,
    verifyRegisterColumn2: unsetBoolean,
    ppeAvailable: unsetBoolean,
    rubberHoseCumLockCouplingGttMarked: unsetBoolean,
    sparkArrestorCcoeApproved: unsetBoolean,
    tremCardAndTrainingCardAvailable: unsetBoolean,
    selfStarterWorking: unsetBoolean,
    batteryTerminalRubberCovers: unsetBoolean,
    noContainerCanExplosivesInCabin: unsetBoolean,
    vmuWorking: unsetBoolean,
    truckTyreConditionAcceptable: unsetBoolean,
    batteryCutOffSwitchCondition: unsetBoolean,
    handBrakeWorking: unsetBoolean,
    earthCleatProvided: unsetBoolean,
    inspectionArea: "Main IN gate inspection bay",
    sealNumber: "",
    verifiedBy: "",
    verificationNotes: "Physical inspection completed",
    exceptionRemarks: "",
  },
};

export function EntryWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [pass, setPass] = useState<CrewPass | null>(null);
  const [resolving, setResolving] = useState(false);
  const [submitted, setSubmitted] = useState<GateEntryRecord | null>(null);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const safetyTop = useRef<HTMLDivElement>(null);
  const {
    register, setValue, watch, trigger, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGateEntryInput>({ resolver: zodResolver(createGateEntrySchema), defaultValues, mode: "onBlur" });

  useEffect(() => {
    let active = true;
    void getDestinations().then((items) => active && setDestinations(items)).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (user?.name) setValue("safetyChecklist.verifiedBy", user.name, { shouldValidate: false });
  }, [setValue, user?.name]);

  const values = watch();
  const actualTruck = watch("actualTankTruckNumber");
  const ttMatch = useMemo(() => Boolean(pass && normalizeTruck(pass.ttNumberOnPass) === normalizeTruck(actualTruck)), [pass, actualTruck]);
  const completedSafety = IN_GATE_SAFETY_ITEMS.filter(({ key }) => typeof values.safetyChecklist[key] === "boolean").length;
  const failedSafety = IN_GATE_SAFETY_ITEMS.filter(({ key }) => values.safetyChecklist[key] === false);
  const totalSafetyItems = IN_GATE_SAFETY_ITEMS.length;
  const documentWarnings = pass ? Array.from(new Set([
    ...(pass.warnings ?? []),
    ...(isExpired(pass.passValidUntil) ? ["Crew pass is expired"] : []),
    ...(isExpired(pass.drivingLicenseExpiryDate) ? ["Driving licence is expired"] : []),
  ])) : [];
  const documentsExpired = Boolean(pass && (isExpired(pass.passValidUntil) || isExpired(pass.drivingLicenseExpiryDate)));

  async function scan(value: string, method: QrScanMethod = "MANUAL") {
    setResolving(true);
    setPass(null);
    setValue("crewPassId", "", { shouldValidate: false });
    try {
      const resolved = await resolvePass(value);
      setPass(resolved);
      setValue("crewPassId", resolved.id, { shouldValidate: true });
      setValue("qrScanMethod", method, { shouldValidate: true });
      setValue("actualTankTruckNumber", resolved.ttNumberOnPass, { shouldValidate: true });
      const hasWarnings = (resolved.warnings?.length ?? 0) > 0 || isExpired(resolved.passValidUntil) || isExpired(resolved.drivingLicenseExpiryDate);
      toast.success(hasWarnings ? "Crew pass scanned with warnings" : "Crew pass scanned successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pass verification failed");
    } finally {
      setResolving(false);
    }
  }

  async function next() {
    if (step === 0) {
      if (!pass) return toast.error("Scan and verify a crew pass first");
      setStep(1);
      return;
    }
    const fieldsByStep: Record<number, FieldPath<CreateGateEntryInput>[]> = {
      1: ["customerDestination", "actualTankTruckNumber", "abs", "challanNumber", "driverPassNumber", "driverAbt", "helperName", "helperPassNumber", "helperAbt", "mobileTokenNumber", "driverSignatureConfirmed", "remarks"],
      2: IN_GATE_SAFETY_ITEMS.map(({ key }) => `safetyChecklist.${key}` as FieldPath<CreateGateEntryInput>).concat([
        "safetyChecklist.tlfNo", "safetyChecklist.accessMethod", "safetyChecklist.inspectionArea", "safetyChecklist.sealNumber", "safetyChecklist.verifiedBy", "safetyChecklist.verificationNotes", "safetyChecklist.exceptionRemarks",
      ]),
    };
    const valid = await trigger(fieldsByStep[step] ?? []);
    if (!valid) {
      if (step === 2) safetyTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return toast.error("Please correct the highlighted fields");
    }
    if (step === 1 && pass?.crewType === "DRIVER_WITH_HELPER" && (!(values.helperName ?? "").trim() || !(values.helperPassNumber ?? "").trim())) {
      return toast.error("Helper name and helper pass number are required for this crew pass");
    }
    if (step === 1 && !ttMatch && (values.remarks ?? "").trim().length < 5) return toast.error("Add a remark explaining the TT number mismatch");
    setStep((value) => Math.min(3, value + 1));
  }

  async function submit(input: CreateGateEntryInput) {
    try {
      const entry = await createEntry(input);
      setSubmitted(entry);
      toast.success("Vehicle IN entry created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Entry could not be created");
    }
  }

  function restart() {
    reset({ ...defaultValues, safetyChecklist: { ...defaultValues.safetyChecklist, verifiedBy: user?.name ?? "" } });
    setPass(null); setStep(0); setSubmitted(null);
  }

  const StepIcon = steps[step]!.icon;
  if (submitted) return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <div className="panel overflow-hidden text-center">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 py-10 text-white">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-8 ring-white/10"><CheckCircle2 className="h-11 w-11" /></span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-100">Entry successfully recorded</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{submitted.displaySerial}</h2>
          <p className="mt-2 text-sm text-emerald-100">Status: IN · Time: {formatIndiaTime(submitted.timeIn)}</p>
        </div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
          <Summary label="Tank Truck" value={submitted.actualTankTruckNumber} />
          <Summary label="Driver" value={submitted.driverName} />
          <div className="bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">TT Verification</p><div className="mt-2"><Badge tone={submitted.ttNumberMatch ? "green" : "red"}>{submitted.ttNumberMatch ? "Matched" : "Mismatch"}</Badge></div></div>
        </div>
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
          <Button type="button" onClick={restart} icon={<RotateCcw className="h-5 w-5" />}>Create Next Entry</Button>
          <Button type="button" variant="secondary" onClick={() => window.print()} icon={<Printer className="h-5 w-5" />}>Print Acknowledgement</Button>
          <Link href={`/entries/${submitted.id}`}><Button type="button" variant="secondary" className="w-full">View Record</Button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="mb-6 overflow-x-auto pb-2"><div className="grid min-w-[680px] grid-cols-4 gap-3">
        {steps.map((item, index) => {
          const active = index === step; const complete = index < step;
          return <div key={item.title} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${active ? "border-orange-200 bg-orange-50" : complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-iocl-orange text-white" : complete ? "bg-iocl-green text-white" : "bg-slate-100 text-slate-400"}`}>{complete ? <Check className="h-5 w-5" /> : <item.icon className="h-5 w-5" />}</span>
            <div><p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Step {index + 1}</p><p className={`text-sm font-black ${active || complete ? "text-iocl-navy" : "text-slate-400"}`}>{item.title}</p></div>
          </div>;
        })}
      </div></div>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7"><div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-iocl-orange"><StepIcon className="h-6 w-6" /></span>
          <div><h2 className="text-xl font-black text-iocl-navy">{steps[step]!.title}</h2><p className="mt-0.5 text-xs text-slate-500">{step === 0 ? "Read official crew-pass information" : step === 1 ? "Capture physical vehicle and movement information" : step === 2 ? "Complete all mandatory checks" : "Confirm every detail before submission"}</p></div>
        </div></div>

        <div className="p-5 sm:p-7">
          {step === 0 ? <div><QRScanner onDetected={scan} loading={resolving} />{pass ? <PassDetails pass={pass} /> : null}{errors.crewPassId ? <ErrorText>{errors.crewPassId.message}</ErrorText> : null}</div> : null}

          {step === 1 ? <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Customer / Destination" error={errors.customerDestination?.message} className="lg:col-span-2"><input {...register("customerDestination")} className="field-input" placeholder="e.g. VASUGI AGENCIES" list="destination-options" /><datalist id="destination-options">{destinations.map((item) => <option key={item.id} value={item.name}>{item.code}</option>)}</datalist></Field>
            <Field label="Actual Physical Tank Truck Number" error={errors.actualTankTruckNumber?.message}><input {...register("actualTankTruckNumber")} className="field-input font-black uppercase tracking-wider" placeholder="TN74AZ8730" /></Field>
            <div><label className="field-label">TT Number Match (automatic)</label><div className={`flex min-h-13 items-center justify-between rounded-2xl border px-4 ${ttMatch ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}><div><p className={`text-sm font-black ${ttMatch ? "text-emerald-800" : "text-red-800"}`}>{ttMatch ? "YES — Numbers match" : "NO — Mismatch detected"}</p><p className="text-[11px] text-slate-500">TT on pass: {pass?.ttNumberOnPass}</p></div><Badge tone={ttMatch ? "green" : "red"}>{ttMatch ? "Verified" : "Alert"}</Badge></div></div>
            <ToggleField label="ABS" value={typeof values.abs === "boolean" ? values.abs : undefined} error={errors.abs?.message} onChange={(value) => setValue("abs", value, { shouldValidate: true })} />
            <Field label="Challan Number" error={errors.challanNumber?.message}><input {...register("challanNumber")} className="field-input uppercase" placeholder="CH-482901" /></Field>
            <Field label="Driver Pass Number" error={errors.driverPassNumber?.message}><input {...register("driverPassNumber")} className="field-input uppercase" placeholder="DP-7412" /></Field>
            <ToggleField label="ABT — Driver" value={typeof values.driverAbt === "boolean" ? values.driverAbt : undefined} error={errors.driverAbt?.message} onChange={(value) => setValue("driverAbt", value, { shouldValidate: true })} />
            <Field label="Mobile Token Number" error={errors.mobileTokenNumber?.message}><input {...register("mobileTokenNumber")} className="field-input uppercase" placeholder="MT-1003" /></Field>
            <Field label={pass?.crewType === "DRIVER_WITH_HELPER" ? "Helper Name *" : "Helper Name"} error={errors.helperName?.message}><input {...register("helperName")} className="field-input" placeholder={pass?.crewType === "DRIVER_WITH_HELPER" ? "Required" : "Optional"} /></Field>
            <Field label={pass?.crewType === "DRIVER_WITH_HELPER" ? "Helper Pass Number *" : "Helper Pass Number"} error={errors.helperPassNumber?.message}><input {...register("helperPassNumber")} className="field-input uppercase" placeholder={pass?.crewType === "DRIVER_WITH_HELPER" ? "Required" : "Optional"} /></Field>
            <ToggleField label="ABT — Helper" value={typeof values.helperAbt === "boolean" ? values.helperAbt : undefined} error={errors.helperAbt?.message} onChange={(value) => setValue("helperAbt", value, { shouldValidate: true })} />
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-4"><label className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-orange-600" checked={values.driverSignatureConfirmed === true} onChange={(event) => setValue("driverSignatureConfirmed", event.target.checked as true, { shouldValidate: true })} /><span className="text-sm font-black text-iocl-navy">Driver has reviewed and confirmed the gate entry information</span></label>{errors.driverSignatureConfirmed ? <ErrorText>{errors.driverSignatureConfirmed.message}</ErrorText> : null}</div>
            <Field label="Remarks" error={errors.remarks?.message} className="lg:col-span-2"><textarea {...register("remarks")} className="field-textarea" placeholder="Operational notes; mandatory for TT mismatch" /></Field>
            {!ttMatch ? <div className="lg:col-span-2 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><Info className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">TT mismatch is flagged for review</p><p className="mt-1 text-xs leading-5">Both numbers are preserved in the audit trail. Record the physical verification reason in Remarks.</p></div></div> : null}
          </div> : null}

          {step === 2 ? <div ref={safetyTop}>
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">Physical safety inspection</p><p className="mt-1 text-xs text-blue-700">Every check requires Yes or No. Verify Register columns are optional.</p></div><Badge tone={completedSafety >= totalSafetyItems - 2 ? "green" : "orange"}>{completedSafety} of {totalSafetyItems} answered</Badge></div>
            <div className="space-y-3">{IN_GATE_SAFETY_ITEMS.map((item, index) => {
              const field = `safetyChecklist.${item.key}` as FieldPath<CreateGateEntryInput>;
              const value = values.safetyChecklist[item.key];
              const itemError = errors.safetyChecklist?.[item.key]?.message;
              return <div key={item.key} className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[48px_1fr_auto] sm:items-center ${itemError ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-iocl-navy">{String(index + 1).padStart(2, "0")}</span>
                <div><p className="text-sm font-black text-iocl-navy">{item.label}</p>{itemError ? <ErrorText>{itemError}</ErrorText> : null}</div>
                <YesNoToggle compact value={typeof value === "boolean" ? value : undefined} onChange={(checked) => setValue(field, checked as never, { shouldValidate: true })} />
              </div>;
            })}</div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <Field label="TLF No" error={errors.safetyChecklist?.tlfNo?.message}><input {...register("safetyChecklist.tlfNo")} className="field-input uppercase" placeholder="Optional" /></Field>
              <Field label="Access Method" error={errors.safetyChecklist?.accessMethod?.message}><input {...register("safetyChecklist.accessMethod")} className="field-input" placeholder="Optional" /></Field>
              <Field label="Inspection Area" error={errors.safetyChecklist?.inspectionArea?.message}><input {...register("safetyChecklist.inspectionArea")} className="field-input" /></Field>
              <Field label="Seal Number" error={errors.safetyChecklist?.sealNumber?.message}><input {...register("safetyChecklist.sealNumber")} className="field-input uppercase" placeholder="SEAL-482901" /></Field>
              <Field label="Verified By (authenticated user)" error={errors.safetyChecklist?.verifiedBy?.message}><input {...register("safetyChecklist.verifiedBy")} readOnly className="field-input bg-slate-100" /></Field>
              <Field label="Verification Notes" error={errors.safetyChecklist?.verificationNotes?.message}><textarea {...register("safetyChecklist.verificationNotes")} className="field-textarea min-h-13" /></Field>
              {failedSafety.length ? <div className="lg:col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-black">Failed checks</p><p className="mt-1 text-xs">{failedSafety.map((item) => item.label).join(" • ")}</p></div> : null}
              <Field label="Safety Exception Remarks" error={errors.safetyChecklist?.exceptionRemarks?.message} className="lg:col-span-2"><textarea {...register("safetyChecklist.exceptionRemarks")} className="field-textarea min-h-20" placeholder="Required when any answer is No (minimum 10 characters)" /></Field>
            </div>
          </div> : null}

          {step === 3 && pass ? <div className="space-y-5">
            {documentWarnings.length ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-black">Document warning</p>{documentWarnings.map((warning) => <p key={warning} className="mt-1">• {warning}</p>)}{documentsExpired ? <p className="mt-2 text-xs">Production IN submission is blocked for expired documents; the scanned values remain visible for verification and audit.</p> : null}</div> : null}
            <ReviewSection title="Verified crew pass" icon={<UserRound className="h-5 w-5" />} items={[["Crew ID", pass.crewId], ["Driver", pass.driverName], ["Crew Type", pass.crewType.replaceAll("_", " ")], ["Pass Valid Until", formatIndiaDate(pass.passValidUntil)], ["Driving Licence", pass.drivingLicenseNumber], ["Licence Expiry", formatIndiaDate(pass.drivingLicenseExpiryDate)]]} />
            <ReviewSection title="Vehicle and entry details" icon={<Truck className="h-5 w-5" />} items={[["Actual TT Number", values.actualTankTruckNumber], ["TT on Pass", pass.ttNumberOnPass], ["TT Match", ttMatch ? "YES" : "NO — MISMATCH"], ["Customer / Destination", values.customerDestination], ["ABS", values.abs ? "YES" : "NO"], ["Challan", values.challanNumber], ["Driver Pass", values.driverPassNumber], ["Driver ABT", values.driverAbt ? "YES" : "NO"], ["Helper", values.helperName || "Not provided"], ["Helper ABT", values.helperAbt ? "YES" : "NO"], ["Mobile Token", values.mobileTokenNumber], ["Driver Confirmation", values.driverSignatureConfirmed ? "CONFIRMED" : "NOT CONFIRMED"], ["Remarks", values.remarks || "—"]]} />
            <ReviewSection title="Safety verification" icon={<ShieldCheck className="h-5 w-5" />} items={[["Answered", `${completedSafety} of ${totalSafetyItems}`], ["Checks Passed", `${totalSafetyItems - failedSafety.length} of ${totalSafetyItems}`], ["Failed Checks", failedSafety.length ? failedSafety.map((item) => item.label).join(", ") : "None"], ["TLF No", values.safetyChecklist.tlfNo || "Not provided"], ["Access Method", values.safetyChecklist.accessMethod || "Not provided"], ["Inspection Area", values.safetyChecklist.inspectionArea], ["Seal Number", values.safetyChecklist.sealNumber], ["Verified By", values.safetyChecklist.verifiedBy], ["Verification Notes", values.safetyChecklist.verificationNotes], ["Exceptions", values.safetyChecklist.exceptionRemarks || "No exception recorded"]]} />
            <div className="flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><FileText className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">Submission creates an auditable IN record</p><p className="mt-1 text-xs leading-5 text-orange-700">Serial number, entry date, time and status are generated by the server. QR-sourced fields remain immutable.</p></div></div>
          </div> : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Button type="button" variant="ghost" disabled={step === 0 || isSubmitting} onClick={() => setStep((value) => Math.max(0, value - 1))} icon={<ArrowLeft className="h-5 w-5" />}>Back</Button>
          {step < 3 ? <Button type="button" onClick={next} icon={<ArrowRight className="h-5 w-5" />} className="min-w-44">Continue</Button> : <Button type="submit" loading={isSubmitting} disabled={documentsExpired} title={documentsExpired ? "Expired pass or driving licence must be renewed before vehicle IN" : undefined} icon={<CheckCircle2 className="h-5 w-5" />} className="min-w-52">{documentsExpired ? "Expired Documents — IN Blocked" : "Confirm Vehicle IN"}</Button>}
        </div>
      </section>
    </form>
  );
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) { return <div className={className}><label className="field-label">{label}</label>{children}{error ? <ErrorText>{error}</ErrorText> : null}</div>; }
function ToggleField({ label, value, error, onChange }: { label: string; value: boolean | undefined; error?: string; onChange: (value: boolean) => void }) { return <div><label className="field-label">{label}</label><YesNoToggle value={value} onChange={onChange} />{error ? <ErrorText>{error}</ErrorText> : null}</div>; }
function ErrorText({ children }: { children?: React.ReactNode }) { return <p className="mt-1.5 text-xs font-bold text-red-600">{children}</p>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="bg-white p-5"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 text-lg font-black text-iocl-navy">{value}</p></div>; }
function ReviewSection({ title, icon, items }: { title: string; icon: React.ReactNode; items: Array<[string, string]> }) { return <div className="overflow-hidden rounded-3xl border border-slate-200"><div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 font-black text-iocl-navy">{icon}{title}</div><div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">{items.map(([label, value]) => <div key={label} className="bg-white p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 break-words text-sm font-black text-iocl-navy">{value}</p></div>)}</div></div>; }
