import { Check, X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ToggleProps {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function YesNoToggle({ value, onChange, disabled, compact }: ToggleProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5", compact ? "w-44" : "w-full")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition",
          value === true ? "bg-iocl-green text-white shadow-sm" : "text-slate-500 hover:bg-white",
        )}
      >
        <Check className="h-4 w-4" /> Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition",
          value === false ? "bg-red-600 text-white shadow-sm" : "text-slate-500 hover:bg-white",
        )}
      >
        <X className="h-4 w-4" /> No
      </button>
    </div>
  );
}
