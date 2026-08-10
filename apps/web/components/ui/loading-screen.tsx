import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Image src="/indian-oil-logo.jpeg" alt="Indian Oil" width={84} height={84} className="mx-auto rounded-full" priority />
        <LoaderCircle className="mx-auto mt-5 h-7 w-7 animate-spin text-iocl-orange" />
        <p className="mt-3 text-sm font-semibold text-slate-500">Preparing gate console...</p>
      </div>
    </div>
  );
}
