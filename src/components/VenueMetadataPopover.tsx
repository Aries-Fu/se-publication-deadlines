import * as Popover from "@radix-ui/react-popover";
import { ExternalLink, Info } from "lucide-react";
import { useRef, useState } from "react";
import type { Venue } from "../types/deadline";
import { labelRecordType } from "../utils/date";

type VenueMetadataPopoverProps = {
  venue: Venue;
};

function MetadataRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (value === undefined || value === "") {
    return null;
  }

  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export function VenueMetadataPopover({ venue }: VenueMetadataPopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const openPopover = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    setOpen(true);
  };

  const closePopover = () => {
    timerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-sm font-semibold text-slate-950 underline decoration-sky-300 decoration-2 underline-offset-4 outline-none transition hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-ring"
          onMouseEnter={openPopover}
          onMouseLeave={closePopover}
          onFocus={openPopover}
          aria-label={`Show metadata for ${venue.name}`}
        >
          {venue.shortName}
          <Info className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          collisionPadding={16}
          className="z-50 w-[min(92vw,360px)] rounded-md border border-slate-200 bg-white p-4 text-slate-700 shadow-glow outline-none"
          onMouseEnter={openPopover}
          onMouseLeave={closePopover}
        >
          <div className="space-y-4">
            <div>
              <div className="text-base font-semibold text-slate-950">{venue.shortName}</div>
              <div className="mt-1 text-sm text-slate-600">{venue.name}</div>
            </div>

            <div className="space-y-2">
              <MetadataRow label="Type" value={labelRecordType(venue.type)} />
              <MetadataRow label="Publisher" value={venue.publisher} />
              <MetadataRow label="CORE" value={venue.ranking?.core} />
              <MetadataRow label="CCF" value={venue.ranking?.ccf} />
              <MetadataRow label="JCR" value={venue.metrics?.jcrQuartile ?? venue.ranking?.jcrQuartile} />
              <MetadataRow label="Impact factor" value={venue.metrics?.impactFactor} />
              <MetadataRow label="Metric year" value={venue.metricsYear} />
              <MetadataRow label="Last checked" value={venue.source?.checkedDate} />
            </div>

            {venue.notes ? <p className="text-sm leading-6 text-slate-600">{venue.notes}</p> : null}

            {venue.website ? (
              <a
                href={venue.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900"
              >
                Website
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
