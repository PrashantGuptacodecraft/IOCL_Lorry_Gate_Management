import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] p-5"><div className="panel max-w-lg p-8 text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-iocl-orange"><MapPinOff className="h-10 w-10" /></span><h1 className="mt-6 text-3xl font-black text-iocl-navy">Page not found</h1><p className="mt-3 text-sm leading-6 text-slate-500">The requested gate-management page does not exist or has moved.</p><Link href="/" className="mt-6 inline-block"><Button>Return to Login</Button></Link></div></main>;
}
