import { ExternalLink } from "lucide-react";
import type { Venue } from "../types/deadline";
import { FavoriteButton } from "./FavoriteButton";
import { VenueMetadataPopover } from "./VenueMetadataPopover";
import { Badge } from "./ui/badge";

type JournalListProps = {
  venues: Venue[];
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
};

function venueFavoriteId(venue: Venue): string {
  return `venue:${venue.id}`;
}

function rankParts(venue: Venue): string[] {
  return [
    venue.ranking?.core ? `CORE ${venue.ranking.core}` : undefined,
    venue.ranking?.ccf ? `CCF ${venue.ranking.ccf}` : undefined,
    venue.metrics?.jcrQuartile ? `JCR ${venue.metrics.jcrQuartile}` : undefined,
  ].filter((part): part is string => Boolean(part));
}

function CompactCategories({ categories }: { categories: string[] }): JSX.Element {
  return (
    <div
      className="w-full min-w-0"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: "0.25rem",
      }}
    >
      {categories.map((category) => (
        <Badge
          key={category}
          variant="muted"
          className="px-1.5 text-[11px] leading-4"
          style={{
            flex: "0 0 auto",
            maxWidth: "100%",
            whiteSpace: "nowrap",
          }}
          title={category}
        >
          {category}
        </Badge>
      ))}
    </div>
  );
}

export function JournalList({
  venues,
  favoriteIds,
  onToggleFavorite,
}: JournalListProps): JSX.Element {
  return (
    <div className="w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Journal list</h2>
        <p className="mt-1 text-xs text-slate-500">
          Journals are venue metadata entries. Deadline fields are shown as N/A.
        </p>
      </div>
      <div>
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
          </colgroup>
          <thead className="bg-white text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Favorite</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Venue</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Categories</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Rank</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Impact Factor</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Deadline</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Days Left</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Status</th>
              <th className="border-b border-slate-200 px-3 py-3 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((venue) => {
              const favoriteId = venueFavoriteId(venue);
              const ranks = rankParts(venue);

              return (
                <tr key={venue.id} className="border-b border-slate-100 transition hover:bg-sky-50/50">
                  <td className="break-words px-3 py-4 align-top">
                    <FavoriteButton
                      active={favoriteIds.has(favoriteId)}
                      onToggle={() => onToggleFavorite(favoriteId)}
                      label={`Favorite ${venue.shortName}`}
                    />
                  </td>
                  <td className="break-words px-3 py-4 align-top">
                    <VenueMetadataPopover venue={venue} />
                    <div className="mt-1 text-xs text-slate-500">{venue.name}</div>
                    {venue.publisher ? (
                      <div className="mt-1 text-xs text-slate-500">{venue.publisher}</div>
                    ) : null}
                  </td>
                  <td className="break-words px-3 py-4 align-top">
                    <CompactCategories categories={venue.categories.secondary} />
                  </td>
                  <td className="break-words px-3 py-4 align-top">
                    {ranks.length ? (
                      <div className="flex flex-wrap gap-1">
                        {ranks.map((rank) => (
                          <Badge key={rank} variant="muted">
                            {rank}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="break-words px-3 py-4 align-top">
                    {venue.metrics?.impactFactor ? (
                      <span className="font-medium text-slate-900">{venue.metrics.impactFactor}</span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="break-words px-3 py-4 align-top text-slate-400">N/A</td>
                  <td className="break-words px-3 py-4 align-top text-slate-400">N/A</td>
                  <td className="break-words px-3 py-4 align-top text-slate-400">N/A</td>
                  <td className="break-words px-3 py-4 align-top">
                    {venue.website ? (
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sky-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900"
                        title={`Open ${venue.shortName} website`}
                        aria-label={`Open ${venue.shortName} website`}
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
