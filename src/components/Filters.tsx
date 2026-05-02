import { Grid2X2, ListTree, RotateCcw, Search, Star, Table2 } from "lucide-react";
import type {
  CategoryGroup,
  DeadlineRow,
  FiltersState,
  SortKey,
  ViewMode,
} from "../types/deadline";
import { labelDeadline } from "../utils/date";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

type FiltersProps = {
  categories: CategoryGroup[];
  rows: DeadlineRow[];
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  sortKey: SortKey;
  onSortChange: (sortKey: SortKey) => void;
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
};

const emptyFilters: FiltersState = {
  search: "",
  primaryCategory: "",
  secondaryCategory: "",
  venueType: "",
  deadlineLabel: "",
  status: "",
  ranking: "",
  favoritesOnly: false,
};

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "nearest", label: "Nearest deadline first" },
  { value: "latest", label: "Latest deadline first" },
  { value: "venue", label: "Venue name A-Z" },
  { value: "core", label: "CORE ranking" },
  { value: "ccf", label: "CCF ranking" },
  { value: "jcr", label: "JCR quartile" },
  { value: "impactFactor", label: "Impact factor" },
];

const journalSortOptions: Array<{ value: SortKey; label: string }> = [
  { value: "venue", label: "Venue name A-Z" },
  { value: "core", label: "CORE ranking" },
  { value: "ccf", label: "CCF ranking" },
  { value: "jcr", label: "JCR quartile" },
  { value: "impactFactor", label: "Impact factor" },
];

export function Filters({
  categories,
  rows,
  filters,
  onFiltersChange,
  sortKey,
  onSortChange,
  viewMode,
  onViewModeChange,
}: FiltersProps): JSX.Element {
  const selectedPrimary = categories.find((category) => category.id === filters.primaryCategory);
  const isJournalList = filters.venueType === "journal";
  const secondaryOptions = selectedPrimary
    ? selectedPrimary.children
    : categories.flatMap((category) => category.children);
  const deadlineLabels = Array.from(new Set(rows.map((row) => row.deadlineLabel))).sort();
  const availableSortOptions = isJournalList ? journalSortOptions : sortOptions;

  const update = (patch: Partial<FiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-slate-600">
            <span>Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Search venues, titles, categories..."
                className="pl-9"
              />
            </div>
          </label>

          <Select
            label="Sort"
            value={sortKey}
            onChange={(event) => onSortChange(event.target.value as SortKey)}
            className="lg:w-56"
          >
            {availableSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {!isJournalList ? (
            <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => onViewModeChange("table")}
              title="Table view"
              aria-label="Table view"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "outline"}
              size="icon"
              onClick={() => onViewModeChange("cards")}
              title="Card view"
              aria-label="Card view"
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "timeline" ? "default" : "outline"}
              size="icon"
              onClick={() => onViewModeChange("timeline")}
              title="Timeline view"
              aria-label="Timeline view"
            >
              <ListTree className="h-4 w-4" />
            </Button>
            </div>
          ) : null}

          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm font-medium text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={filters.favoritesOnly}
              onChange={(event) => update({ favoritesOnly: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Favorites only
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Select
            label="Top-level area"
            value={filters.primaryCategory}
            onChange={(event) =>
              update({ primaryCategory: event.target.value, secondaryCategory: "" })
            }
          >
            <option value="">All areas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            label="Subcategory"
            value={filters.secondaryCategory}
            onChange={(event) => update({ secondaryCategory: event.target.value })}
          >
            <option value="">All subcategories</option>
            {secondaryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Select
            label="Tracker type"
            value={filters.venueType}
            onChange={(event) => {
              const venueType = event.target.value;
              update({
                venueType,
                deadlineLabel: venueType === "journal" ? "" : filters.deadlineLabel,
                status: venueType === "journal" ? "" : filters.status,
              });

              if (venueType === "journal" && (sortKey === "nearest" || sortKey === "latest")) {
                onSortChange("venue");
              }
            }}
          >
            <option value="">All types</option>
            <option value="conference">Conference</option>
            <option value="workshop">Workshop</option>
            <option value="journal">Journal</option>
            <option value="special_issue">Special issue</option>
          </Select>

          {!isJournalList ? (
            <Select
              label="Deadline type"
              value={filters.deadlineLabel}
              onChange={(event) => update({ deadlineLabel: event.target.value })}
            >
              <option value="">All deadlines</option>
              {deadlineLabels.map((label) => (
                <option key={label} value={label}>
                  {labelDeadline(label)}
                </option>
              ))}
            </Select>
          ) : null}

          {!isJournalList ? (
            <Select
              label="Status"
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses (default)</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="tentative">Tentative</option>
            </Select>
          ) : null}

          <Select
            label="Ranking"
            value={filters.ranking}
            onChange={(event) => update({ ranking: event.target.value })}
          >
            <option value="">All rankings</option>
            <option value="core:A*">CORE A*</option>
            <option value="core:A">CORE A</option>
            <option value="core:B">CORE B</option>
            <option value="core:C">CORE C</option>
            <option value="ccf:A">CCF A</option>
            <option value="ccf:B">CCF B</option>
            <option value="ccf:C">CCF C</option>
            <option value="jcr:Q1">JCR Q1</option>
            <option value="jcr:Q2">JCR Q2</option>
            <option value="jcr:Q3">JCR Q3</option>
            <option value="jcr:Q4">JCR Q4</option>
          </Select>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onFiltersChange(emptyFilters)}>
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </Button>
        </div>
      </div>
    </section>
  );
}
