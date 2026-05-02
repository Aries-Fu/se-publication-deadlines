import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import type { DeadlineRow } from "../types/deadline";
import { cn } from "../lib/utils";
import { formatDeadlineDate, labelDeadline, labelRecordType } from "../utils/date";
import { CountdownBadge } from "./CountdownBadge";
import { FavoriteButton } from "./FavoriteButton";
import { VenueMetadataPopover } from "./VenueMetadataPopover";
import { Badge } from "./ui/badge";

const labelColors: Record<string, string> = {
  abstract: "border-sky-200 bg-sky-50 text-sky-700",
  full_paper: "border-rose-200 bg-rose-50 text-rose-700",
  submission: "border-rose-200 bg-rose-50 text-rose-700",
  submission_open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  author_response: "border-amber-200 bg-amber-50 text-amber-700",
  notification: "border-slate-200 bg-slate-50 text-slate-700",
  revision: "border-violet-200 bg-violet-50 text-violet-700",
  camera_ready: "border-teal-200 bg-teal-50 text-teal-700",
  final_decision: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

function RankCell({ row }: { row: DeadlineRow }): JSX.Element {
  const jcrQuartile = row.rank.jcrQuartile ?? row.venue.metrics?.jcrQuartile;
  const parts = [
    row.rank.core ? `CORE ${row.rank.core}` : undefined,
    row.rank.ccf ? `CCF ${row.rank.ccf}` : undefined,
    jcrQuartile ? `JCR ${jcrQuartile}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return parts.length ? (
    <div className="flex flex-wrap gap-1">
      {parts.map((part) => (
        <Badge key={part} variant="muted">
          {part}
        </Badge>
      ))}
    </div>
  ) : (
    <span className="text-slate-400">Not listed</span>
  );
}

type DeadlineTableMeta = {
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
};

function deadlineFavoriteId(row: DeadlineRow): string {
  return `deadline:${row.recordId}`;
}

function CompactCategories({ categories }: { categories: string[] }): JSX.Element {
  return (
    <div className="flex max-w-full flex-wrap gap-1">
      {categories.map((category) => (
        <Badge
          key={category}
          variant="muted"
          className="max-w-full whitespace-normal break-words px-1.5 text-[11px] leading-4"
          title={category}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
}

const columns: Array<ColumnDef<DeadlineRow>> = [
  {
    header: "Favorite",
    cell: ({ row, table }) => {
      const meta = table.options.meta as DeadlineTableMeta;
      const favoriteId = deadlineFavoriteId(row.original);

      return (
        <FavoriteButton
          active={meta.favoriteIds.has(favoriteId)}
          onToggle={() => meta.onToggleFavorite(favoriteId)}
          label={`Favorite ${row.original.title}`}
        />
      );
    },
  },
  {
    header: "Venue",
    cell: ({ row }) => (
      <div className="min-w-0">
        <VenueMetadataPopover venue={row.original.venue} />
        <div className="mt-1 text-xs leading-5 text-slate-500">{row.original.venue.name}</div>
      </div>
    ),
  },
  {
    header: "Title",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium leading-5 text-slate-950">{row.original.title}</div>
        {row.original.deadlineDescription ? (
          <div className="mt-1 text-xs text-slate-500">{row.original.deadlineDescription}</div>
        ) : null}
      </div>
    ),
  },
  {
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{labelRecordType(row.original.recordType)}</Badge>,
  },
  {
    header: "Categories",
    cell: ({ row }) => <CompactCategories categories={row.original.categories.secondary} />,
  },
  {
    header: "Deadline",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(labelColors[row.original.deadlineLabel] ?? "border-slate-200 bg-white")}
      >
        {labelDeadline(row.original.deadlineLabel)}
      </Badge>
    ),
  },
  {
    header: "Date",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="font-medium text-slate-900">{formatDeadlineDate(row.original.deadlineDate)}</div>
        <div className="text-xs text-slate-500">{row.original.timezone}</div>
      </div>
    ),
  },
  {
    header: "Days left",
    cell: ({ row }) => <CountdownBadge date={row.original.deadlineDate} />,
  },
  {
    header: "Rank",
    cell: ({ row }) => <RankCell row={row.original} />,
  },
  {
    header: "IF",
    cell: ({ row }) =>
      row.original.venue.metrics?.impactFactor ? (
        <span className="font-medium">{row.original.venue.metrics.impactFactor}</span>
      ) : (
        <span className="text-slate-400">-</span>
      ),
  },
  {
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          row.original.status === "open" && "border-emerald-200 bg-emerald-50 text-emerald-700",
          row.original.status === "closed" && "border-slate-200 bg-slate-50 text-slate-500",
          row.original.status === "tentative" && "border-amber-200 bg-amber-50 text-amber-700",
        )}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    header: "Source",
    cell: ({ row }) => (
      <a
        href={row.original.source.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sky-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
        title="Open source"
        aria-label={`Open source for ${row.original.title}`}
      >
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>
    ),
  },
];

type DeadlineTableProps = {
  rows: DeadlineRow[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
};

export function DeadlineTable({
  rows,
  favoriteIds,
  onToggleFavorite,
}: DeadlineTableProps): JSX.Element {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      favoriteIds,
      onToggleFavorite,
    },
  });

  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div>
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[10%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[4%]" />
            <col className="w-[6%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b border-slate-200 px-2 py-3 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 transition hover:bg-sky-50/50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="break-words align-top px-2 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
