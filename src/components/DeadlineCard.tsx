import { CalendarDays, ExternalLink } from "lucide-react";
import type { DeadlineRow } from "../types/deadline";
import { formatDeadlineDate, labelDeadline, labelRecordType } from "../utils/date";
import { CountdownBadge } from "./CountdownBadge";
import { FavoriteButton } from "./FavoriteButton";
import { VenueMetadataPopover } from "./VenueMetadataPopover";
import { Badge } from "./ui/badge";

type DeadlineCardProps = {
  row: DeadlineRow;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
};

function deadlineFavoriteId(row: DeadlineRow): string {
  return `deadline:${row.recordId}`;
}

export function DeadlineCard({
  row,
  favoriteIds,
  onToggleFavorite,
}: DeadlineCardProps): JSX.Element {
  const jcrQuartile = row.rank.jcrQuartile ?? row.venue.metrics?.jcrQuartile;
  const favoriteId = deadlineFavoriteId(row);
  const rankParts = [
    row.rank.core ? `CORE ${row.rank.core}` : undefined,
    row.rank.ccf ? `CCF ${row.rank.ccf}` : undefined,
    jcrQuartile ? `JCR ${jcrQuartile}` : undefined,
    row.venue.metrics?.impactFactor ? `IF ${row.venue.metrics.impactFactor}` : undefined,
  ].filter((part): part is string => Boolean(part));

  return (
    <article className="flex min-h-full flex-col justify-between rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-glow">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <VenueMetadataPopover venue={row.venue} />
            <h3 className="mt-2 text-base font-semibold leading-6 text-slate-950">{row.title}</h3>
            {row.deadlineDescription ? (
              <p className="mt-1 text-sm text-slate-500">{row.deadlineDescription}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{labelRecordType(row.recordType)}</Badge>
            <FavoriteButton
              active={favoriteIds.has(favoriteId)}
              onToggle={() => onToggleFavorite(favoriteId)}
              label={`Favorite ${row.title}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {row.categories.secondary.map((category) => (
            <Badge key={category} variant="muted">
              {category}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{labelDeadline(row.deadlineLabel)}</Badge>
          <CountdownBadge date={row.deadlineDate} />
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <CalendarDays className="h-4 w-4 text-sky-500" aria-hidden="true" />
          <span className="font-medium">{formatDeadlineDate(row.deadlineDate)}</span>
          <span className="text-slate-400">/</span>
          <span>{row.timezone}</span>
        </div>

        {rankParts.length ? (
          <div className="flex flex-wrap gap-1">
            {rankParts.map((part) => (
              <Badge key={part} variant="muted">
                {part}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">Checked {row.source.checkedDate}</span>
        <a
          href={row.source.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-sky-700 hover:text-sky-900"
        >
          Source
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
