import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  loadCategories,
  loadDeadlineRecords,
  loadVenues,
  rootDir,
  type DeadlineRecord,
  type Venue,
} from "./data-utils";

type GeneratedDeadlineRow = {
  id: string;
  recordId: string;
  venueId: string;
  venue: Venue;
  title: string;
  recordType: DeadlineRecord["type"];
  status: DeadlineRecord["status"];
  categories: DeadlineRecord["categories"];
  links?: DeadlineRecord["links"];
  rank: NonNullable<DeadlineRecord["rank"]>;
  source: DeadlineRecord["source"];
  notes?: string;
  deadlineLabel: string;
  deadlineDescription?: string;
  deadlineDate: string;
  timezone: string;
};

async function main(): Promise<void> {
  const [categories, venues, records] = await Promise.all([
    loadCategories(),
    loadVenues(),
    loadDeadlineRecords(),
  ]);

  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const rows: GeneratedDeadlineRow[] = [];

  for (const record of records) {
    const venue = venuesById.get(record.venueId);

    if (!venue) {
      throw new Error(`Unknown venueId while building data: ${record.venueId}`);
    }

    record.deadlines.forEach((deadline, index) => {
      rows.push({
        id: `${record.id}:${index}:${deadline.label}`,
        recordId: record.id,
        venueId: record.venueId,
        venue,
        title: record.title,
        recordType: record.type,
        status: record.status,
        categories: record.categories,
        links: record.links,
        rank: record.rank ?? venue.ranking ?? {},
        source: record.source,
        notes: record.notes,
        deadlineLabel: deadline.label,
        deadlineDescription: deadline.description,
        deadlineDate: deadline.date,
        timezone: deadline.timezone,
      });
    });
  }

  rows.sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
  const publicRecords = records.map(({ sourceFile, ...record }) => record);

  const generated = {
    generatedAt: new Date().toISOString(),
    categories,
    venues,
    records: publicRecords,
    deadlineRows: rows,
  };

  const outputPath = join(rootDir, "src", "data", "generated-deadlines.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");
  console.log(`Wrote ${rows.length} deadline rows to ${outputPath}`);
}

void main();
