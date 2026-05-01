import * as React from "react";
import { cn } from "../../lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export function Select({ className, label, children, ...props }: SelectProps): JSX.Element {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
      <span>{label}</span>
      <select
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
