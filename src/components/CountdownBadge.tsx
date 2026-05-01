import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { formatDaysLeft, getDaysLeft, getDeadlineTone } from "../utils/date";

const toneClasses = {
  normal: "border-slate-200 bg-white text-slate-700",
  upcoming: "border-sky-200 bg-sky-50 text-sky-700",
  soon: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
  closed: "border-slate-200 bg-slate-100 text-slate-500",
};

type CountdownBadgeProps = {
  date: string;
  className?: string;
};

export function CountdownBadge({ date, className }: CountdownBadgeProps): JSX.Element {
  const daysLeft = getDaysLeft(date);
  const tone = getDeadlineTone(daysLeft);

  return (
    <Badge variant="outline" className={cn(toneClasses[tone], className)}>
      {formatDaysLeft(daysLeft)}
    </Badge>
  );
}
