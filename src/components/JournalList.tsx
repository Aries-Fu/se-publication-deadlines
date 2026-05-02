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

export function JournalList({
  venues,
  favoriteIds,
  onToggleFavorite,
}: JournalListProps): JSX.Element {
  return (
    <div className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">Journal list</h2>
        <p className="mt-1 text-xs text-slate-500">
          Journals are venue metadata entries. Deadline fields are shown as N/A.
        </p>
      </div>
      <div>
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-normal text-slate-500">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Favorite</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Venue</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Categories</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Rank</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Impact Factor</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Deadline</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Days Left</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Status</th>
              <th className="border-b border-slate-200 px-4 py-3 font-semibold">Website</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((venue) => {
              const favoriteId = venueFavoriteId(venue);
              const ranks = rankParts(venue);

              return (
                <tr key={venue.id} className="border-b border-slate-100 transition hover:bg-sky-50/50">
                  <td className="px-4 py-4 align-top">
                    <FavoriteButton
                      active={favoriteIds.has(favoriteId)}
                      onToggle={() => onToggleFavorite(favoriteId)}
                      label={`Favorite ${venue.shortName}`}
                    />
                  </td>
                  <td className="min-w-56 px-4 py-4 align-top">
                    <VenueMetadataPopover venue={venue} />
                    <div className="mt-1 text-xs text-slate-500">{venue.name}</div>
                    {venue.publisher ? (
                      <div className="mt-1 text-xs text-slate-500">{venue.publisher}</div>
                    ) : null}
                  </td>
                  <td className="min-w-48 px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-1">
                      {venue.categories.secondary.map((category) => (
                        <Badge key={category} variant="muted">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
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
                  <td className="px-4 py-4 align-top">
                    {venue.metrics?.impactFactor ? (
                      <span className="font-medium text-slate-900">{venue.metrics.impactFactor}</span>
                    ) : (
                      <span className="text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-400">N/A</td>
                  <td className="px-4 py-4 align-top text-slate-400">N/A</td>
                  <td className="px-4 py-4 align-top text-slate-400">N/A</td>
                  <td className="px-4 py-4 align-top">
                    {venue.website ? (
                      <a
                        href={venue.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-sky-700 hover:text-sky-900"
                      >
                        Website
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
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
