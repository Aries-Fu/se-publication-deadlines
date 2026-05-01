import { CalendarClock, Github, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import generatedDeadlines from "./data/generated-deadlines.json";
import { DeadlineCard } from "./components/DeadlineCard";
import { DeadlineTable } from "./components/DeadlineTable";
import { FavoriteButton } from "./components/FavoriteButton";
import { Filters } from "./components/Filters";
import { JournalList } from "./components/JournalList";
import { CountdownBadge } from "./components/CountdownBadge";
import { VenueMetadataPopover } from "./components/VenueMetadataPopover";
import { Badge } from "./components/ui/badge";
import { buttonVariants } from "./components/ui/button";
import type {
  DeadlineRow,
  FiltersState,
  GeneratedData,
  SortKey,
  Venue,
  ViewMode,
} from "./types/deadline";
import { filterDeadlineRows } from "./utils/filter";
import { sortDeadlineRows } from "./utils/sort";
import { formatDeadlineDate, formatMonth, labelDeadline } from "./utils/date";
import { cn } from "./lib/utils";

const data = generatedDeadlines as GeneratedData;
const repoUrl = "https://github.com/Aries-Fu/se-publication-deadlines";
const addDeadlineUrl = `${repoUrl}/issues/new?template=add-deadline.yml`;
const favoritesStorageKey = "se-publication-deadlines:favorites";

const initialFilters: FiltersState = {
  search: "",
  primaryCategory: "",
  secondaryCategory: "",
  venueType: "",
  deadlineLabel: "",
  status: "open",
  ranking: "",
  favoritesOnly: false,
};

function deadlineFavoriteId(row: DeadlineRow): string {
  return `deadline:${row.recordId}`;
}

function normalized(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim();
}

function matchesVenueRanking(venue: Venue, ranking: string): boolean {
  if (!ranking) {
    return true;
  }

  const [system, value] = ranking.split(":");

  if (system === "core") {
    return venue.ranking?.core === value;
  }

  if (system === "ccf") {
    return venue.ranking?.ccf === value;
  }

  if (system === "jcr") {
    return venue.metrics?.jcrQuartile === value || venue.ranking?.jcrQuartile === value;
  }

  return true;
}

function filterJournalVenues(
  venues: Venue[],
  filters: FiltersState,
  favoriteIds: Set<string>,
): Venue[] {
  const query = normalized(filters.search);

  return venues.filter((venue) => {
    if (venue.type !== "journal") {
      return false;
    }

    if (filters.favoritesOnly && !favoriteIds.has(`venue:${venue.id}`)) {
      return false;
    }

    if (query) {
      const text = [
        venue.name,
        venue.shortName,
        venue.publisher,
        venue.categories.primary,
        ...venue.categories.secondary,
        venue.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!text.includes(query)) {
        return false;
      }
    }

    if (filters.primaryCategory && venue.categories.primary !== filters.primaryCategory) {
      return false;
    }

    if (filters.secondaryCategory && !venue.categories.secondary.includes(filters.secondaryCategory)) {
      return false;
    }

    return matchesVenueRanking(venue, filters.ranking);
  });
}

function rankValue(value: string | undefined, order: Record<string, number>): number {
  return value ? order[value] ?? Number.POSITIVE_INFINITY : Number.POSITIVE_INFINITY;
}

function sortJournalVenues(venues: Venue[], sortKey: SortKey): Venue[] {
  const coreOrder: Record<string, number> = { "A*": 0, A: 1, B: 2, C: 3 };
  const ccfOrder: Record<string, number> = { A: 0, B: 1, C: 2 };
  const jcrOrder: Record<string, number> = { Q1: 0, Q2: 1, Q3: 2, Q4: 3 };

  return [...venues].sort((a, b) => {
    if (sortKey === "core") {
      return (
        rankValue(a.ranking?.core, coreOrder) - rankValue(b.ranking?.core, coreOrder) ||
        a.shortName.localeCompare(b.shortName)
      );
    }

    if (sortKey === "ccf") {
      return (
        rankValue(a.ranking?.ccf, ccfOrder) - rankValue(b.ranking?.ccf, ccfOrder) ||
        a.shortName.localeCompare(b.shortName)
      );
    }

    if (sortKey === "jcr") {
      return (
        rankValue(a.metrics?.jcrQuartile ?? a.ranking?.jcrQuartile, jcrOrder) -
          rankValue(b.metrics?.jcrQuartile ?? b.ranking?.jcrQuartile, jcrOrder) ||
        a.shortName.localeCompare(b.shortName)
      );
    }

    if (sortKey === "impactFactor") {
      return (
        (b.metrics?.impactFactor ?? -1) - (a.metrics?.impactFactor ?? -1) ||
        a.shortName.localeCompare(b.shortName)
      );
    }

    return a.shortName.localeCompare(b.shortName);
  });
}

function loadFavoriteIds(): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = window.localStorage.getItem(favoritesStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? new Set<string>(parsed.filter((value): value is string => typeof value === "string"))
      : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function Stat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}): JSX.Element {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{helper}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }): JSX.Element {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <CalendarClock className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-950">No {label} match the filters</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Try a broader category, turn off favorites only, or add missing data through GitHub.
      </p>
    </div>
  );
}

function TimelineView({
  rows,
  favoriteIds,
  onToggleFavorite,
}: {
  rows: DeadlineRow[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
}): JSX.Element {
  const groups = rows.reduce<Record<string, DeadlineRow[]>>((acc, row) => {
    const month = formatMonth(row.deadlineDate);
    acc[month] = [...(acc[month] ?? []), row];
    return acc;
  }, {});

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-8">
        {Object.entries(groups).map(([month, monthRows]) => (
          <section key={month} className="grid gap-4 md:grid-cols-[160px_1fr]">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-500">{month}</h2>
            <div className="relative space-y-4 border-l border-slate-200 pl-5">
              {monthRows.map((row) => (
                <article key={row.id} className="relative rounded-md border border-slate-200 p-4">
                  <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-sky-500 bg-white" />
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <VenueMetadataPopover venue={row.venue} />
                        <Badge variant="outline">{labelDeadline(row.deadlineLabel)}</Badge>
                        <FavoriteButton
                          active={favoriteIds.has(deadlineFavoriteId(row))}
                          onToggle={() => onToggleFavorite(deadlineFavoriteId(row))}
                          label={`Favorite ${row.title}`}
                        />
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-950">{row.title}</h3>
                      {row.deadlineDescription ? (
                        <p className="mt-1 text-sm text-slate-500">{row.deadlineDescription}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {formatDeadlineDate(row.deadlineDate)}
                      </span>
                      <CountdownBadge date={row.deadlineDate} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function App(): JSX.Element {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [sortKey, setSortKey] = useState<SortKey>("nearest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(loadFavoriteIds);

  useEffect(() => {
    window.localStorage.setItem(favoritesStorageKey, JSON.stringify(Array.from(favoriteIds)));
  }, [favoriteIds]);

  const toggleFavorite = (id: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const visibleRows = useMemo(() => {
    const rows = filterDeadlineRows(data.deadlineRows, filters).filter((row) => {
      return !filters.favoritesOnly || favoriteIds.has(deadlineFavoriteId(row));
    });

    return sortDeadlineRows(rows, sortKey);
  }, [favoriteIds, filters, sortKey]);

  const visibleJournals = useMemo(() => {
    return sortJournalVenues(filterJournalVenues(data.venues, filters, favoriteIds), sortKey);
  }, [favoriteIds, filters, sortKey]);

  const openRecords = new Set(data.deadlineRows.filter((row) => row.status === "open").map((row) => row.recordId));
  const nextDeadline = sortDeadlineRows(
    data.deadlineRows.filter((row) => row.status === "open"),
    "nearest",
  )[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 bg-tech-grid backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                Community-maintained SE deadline tracker
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                Software Engineering Publication Deadlines
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Track conference deadlines, special issue calls, and journal metadata with structured YAML
                data, automatic validation, and a public GitHub Pages frontend.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
              <a
                href={addDeadlineUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants())}
              >
                <Plus className="h-4 w-4" />
                Add a deadline
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Deadline rows"
              value={data.deadlineRows.length}
              helper="Conference and special issue dates"
            />
            <Stat label="Open calls" value={openRecords.size} helper="Records currently marked open" />
            <Stat label="Venues" value={data.venues.length} helper="Metadata-backed venues" />
            <Stat
              label="Next deadline"
              value={nextDeadline ? formatDeadlineDate(nextDeadline.deadlineDate) : "-"}
              helper={nextDeadline ? `${nextDeadline.venue.shortName} ${labelDeadline(nextDeadline.deadlineLabel)}` : "No open calls"}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Filters
          categories={data.categories}
          rows={data.deadlineRows}
          filters={filters}
          onFiltersChange={setFilters}
          sortKey={sortKey}
          onSortChange={setSortKey}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Showing{" "}
            <span className="font-semibold text-slate-950">
              {filters.venueType === "journal" ? visibleJournals.length : visibleRows.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-950">
              {filters.venueType === "journal"
                ? data.venues.filter((venue) => venue.type === "journal").length
                : data.deadlineRows.length}
            </span>{" "}
            {filters.venueType === "journal" ? "journals" : "deadline rows"}
          </p>
          <p className="hidden text-xs text-slate-500 sm:block">
            Data generated {new Date(data.generatedAt).toLocaleDateString()}
          </p>
        </div>

        {filters.venueType === "journal" && visibleJournals.length === 0 ? (
          <EmptyState label="journals" />
        ) : null}
        {filters.venueType === "journal" && visibleJournals.length > 0 ? (
          <JournalList
            venues={visibleJournals}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}

        {filters.venueType !== "journal" && visibleRows.length === 0 ? (
          <EmptyState label="deadlines" />
        ) : null}
        {filters.venueType !== "journal" && visibleRows.length > 0 && viewMode === "table" ? (
          <DeadlineTable
            rows={visibleRows}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}
        {filters.venueType !== "journal" && visibleRows.length > 0 && viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((row) => (
              <DeadlineCard
                key={row.id}
                row={row}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : null}
        {filters.venueType !== "journal" && visibleRows.length > 0 && viewMode === "timeline" ? (
          <TimelineView
            rows={visibleRows}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
          />
        ) : null}
      </main>
    </div>
  );
}
