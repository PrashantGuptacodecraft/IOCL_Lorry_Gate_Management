import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-iocl-orange to-iocl-orange-deep text-white shadow-glow hover:brightness-105 active:translate-y-px",
  secondary: "border border-slate-200 bg-white text-iocl-navy shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-iocl-navy",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-iocl-green text-white hover:brightness-105",
};

export function Button({ className, variant = "primary", loading, disabled, icon, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
