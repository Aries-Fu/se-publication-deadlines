import { Star } from "lucide-react";
import { cn } from "../lib/utils";

type FavoriteButtonProps = {
  active: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
};

export function FavoriteButton({
  active,
  onToggle,
  label,
  className,
}: FavoriteButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-amber-200 hover:text-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "border-amber-200 bg-amber-50 text-amber-500",
        className,
      )}
      aria-label={label}
      title={label}
    >
      <Star className={cn("h-4 w-4", active && "fill-current")} aria-hidden="true" />
    </button>
  );
}
