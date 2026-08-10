"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "../components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("UI boundary error", { message: error.message, digest: error.digest }); }, [error]);
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-5"><div className="panel max-w-lg p-8 text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-600"><AlertTriangle className="h-10 w-10" /></span><h1 className="mt-6 text-3xl font-black text-iocl-navy">Something went wrong</h1><p className="mt-3 text-sm leading-6 text-slate-500">The page could not be completed safely. Your previous server submission was not automatically repeated.</p><Button type="button" className="mt-6" onClick={reset} icon={<RefreshCw className="h-5 w-5" />}>Try Again</Button>{error.digest ? <p className="mt-4 text-xs text-slate-400">Reference: {error.digest}</p> : null}</div></main>;
}
