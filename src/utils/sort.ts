import { format } from "date-fns";
import type { DeadlineRow, SortKey } from "../types/deadline";

const coreOrder: Record<string, number> = {
  "A*": 0,
  A: 1,
  B: 2,
  C: 3,
};

const ccfOrder: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
};

const jcrOrder: Record<string, number> = {
  Q1: 0,
  Q2: 1,
  Q3: 2,
  Q4: 3,
};

function rankValue(value: string | undefined, order: Record<string, number>): number {
  return value ? order[value] ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
}

function nearestDateValue(row: DeadlineRow): string {
  const today = format(new Date(), "yyyy-MM-dd");
  return row.deadlineDate < today ? `z-${row.deadlineDate}` : `a-${row.deadlineDate}`;
}

export function sortDeadlineRows(rows: DeadlineRow[], sortKey: SortKey): DeadlineRow[] {
  return [...rows].sort((a, b) => {
    if (sortKey === "latest") {
      return b.deadlineDate.localeCompare(a.deadlineDate);
    }

    if (sortKey === "venue") {
      return a.venue.shortName.localeCompare(b.venue.shortName) || a.title.localeCompare(b.title);
    }

    if (sortKey === "core") {
      return (
        rankValue(a.rank.core ?? a.venue.ranking?.core, coreOrder) -
          rankValue(b.rank.core ?? b.venue.ranking?.core, coreOrder) ||
        a.deadlineDate.localeCompare(b.deadlineDate)
      );
    }

    if (sortKey === "ccf") {
      return (
        rankValue(a.rank.ccf ?? a.venue.ranking?.ccf, ccfOrder) -
          rankValue(b.rank.ccf ?? b.venue.ranking?.ccf, ccfOrder) ||
        a.deadlineDate.localeCompare(b.deadlineDate)
      );
    }

    if (sortKey === "jcr") {
      return (
        rankValue(a.rank.jcrQuartile ?? a.venue.metrics?.jcrQuartile, jcrOrder) -
          rankValue(b.rank.jcrQuartile ?? b.venue.metrics?.jcrQuartile, jcrOrder) ||
        a.deadlineDate.localeCompare(b.deadlineDate)
      );
    }

    if (sortKey === "impactFactor") {
      return (
        (b.venue.metrics?.impactFactor ?? -1) - (a.venue.metrics?.impactFactor ?? -1) ||
        a.deadlineDate.localeCompare(b.deadlineDate)
      );
    }

    return nearestDateValue(a).localeCompare(nearestDateValue(b));
  });
}
