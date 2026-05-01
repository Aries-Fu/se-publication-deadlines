import type { DeadlineRow, FiltersState } from "../types/deadline";

function normalized(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function rowSearchText(row: DeadlineRow): string {
  return [
    row.venue.name,
    row.venue.shortName,
    row.title,
    row.recordType,
    row.deadlineLabel,
    row.deadlineDescription,
    row.categories.primary,
    ...row.categories.secondary,
    row.venue.publisher,
    row.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesRanking(row: DeadlineRow, ranking: string): boolean {
  if (!ranking) {
    return true;
  }

  const [system, value] = ranking.split(":");

  if (system === "core") {
    return (row.rank.core ?? row.venue.ranking?.core) === value;
  }

  if (system === "ccf") {
    return (row.rank.ccf ?? row.venue.ranking?.ccf) === value;
  }

  if (system === "jcr") {
    return (row.rank.jcrQuartile ?? row.venue.metrics?.jcrQuartile) === value;
  }

  return true;
}

export function filterDeadlineRows(rows: DeadlineRow[], filters: FiltersState): DeadlineRow[] {
  const query = normalized(filters.search);

  return rows.filter((row) => {
    if (query && !rowSearchText(row).includes(query)) {
      return false;
    }

    if (filters.primaryCategory && row.categories.primary !== filters.primaryCategory) {
      return false;
    }

    if (
      filters.secondaryCategory &&
      !row.categories.secondary.includes(filters.secondaryCategory)
    ) {
      return false;
    }

    if (filters.venueType) {
      if (filters.venueType === "journal") {
        return false;
      }

      if (filters.venueType === "special_issue" && row.recordType !== "special_issue") {
        return false;
      }

      if (filters.venueType !== "special_issue" && row.venue.type !== filters.venueType) {
        return false;
      }
    }

    if (filters.deadlineLabel && row.deadlineLabel !== filters.deadlineLabel) {
      return false;
    }

    if (filters.status && row.status !== filters.status) {
      return false;
    }

    return matchesRanking(row, filters.ranking);
  });
}
