import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

export const rootDir = process.cwd();
export const dataDir = join(rootDir, "data");

export const allowedCoreRanks = ["A*", "A", "B", "C"] as const;
export const allowedCcfRanks = ["A", "B", "C"] as const;
export const allowedJcrQuartiles = ["Q1", "Q2", "Q3", "Q4"] as const;
export const allowedDeadlineLabels = [
  "abstract",
  "full_paper",
  "submission",
  "submission_open",
  "author_response",
  "notification",
  "revision",
  "camera_ready",
  "final_decision",
  "registration",
  "proposal",
] as const;
export const allowedSourceAdapters = [
  "researchr",
  "springerCollections",
  "emseSpecialIssues",
  "genericHtmlDateScanner",
] as const;

export type VenueType = "conference" | "journal";
export type DeadlineRecordType = "conference" | "workshop" | "special_issue";
export type DeadlineStatus = "open" | "closed" | "tentative";
export type DeadlineLabel = (typeof allowedDeadlineLabels)[number];
export type SourceAdapterName = (typeof allowedSourceAdapters)[number];

export type CategoryGroup = {
  id: string;
  name: string;
  children: Array<{
    id: string;
    name: string;
  }>;
};

export type CategorySelection = {
  primary: string;
  secondary: string[];
};

export type Rank = {
  core?: string;
  ccf?: string;
  jcrQuartile?: string;
};

export type Metrics = {
  impactFactor?: number;
  jcrQuartile?: string;
};

export type Source = {
  url: string;
  checkedDate: string;
};

export type Venue = {
  id: string;
  name: string;
  shortName: string;
  type: VenueType;
  publisher?: string;
  website?: string;
  categories: CategorySelection;
  ranking?: Rank;
  metrics?: Metrics;
  metricsYear?: number;
  notes?: string;
  source?: Source;
};

export type DeadlineItem = {
  label: DeadlineLabel;
  description?: string;
  date: string;
  timezone: string;
};

export type DeadlineRecord = {
  id: string;
  venueId: string;
  title: string;
  type: DeadlineRecordType;
  status: DeadlineStatus;
  deadlines: DeadlineItem[];
  categories: CategorySelection;
  links?: Record<string, string>;
  rank?: Rank;
  source: Source;
  notes?: string;
};

export type LoadedDeadlineRecord = DeadlineRecord & {
  sourceFile: string;
};

export type SourceDefinition = {
  id: string;
  kind: "deadline" | "venue" | "workshop" | "special_issue";
  recordId?: string;
  venueId?: string;
  adapter?: SourceAdapterName;
  url: string;
  expectedDeadlineLabels?: string[];
  checkFrequency?: "daily" | "weekly" | "monthly";
  notes?: string;
};

export async function readYamlArray<T>(filePath: string): Promise<T[]> {
  const raw = await readFile(filePath, "utf8");
  const parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });

  if (parsed === null || parsed === undefined) {
    return [];
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a YAML array`);
  }

  return parsed as T[];
}

export async function findYamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => join(dir, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export async function loadCategories(): Promise<CategoryGroup[]> {
  return readYamlArray<CategoryGroup>(join(dataDir, "categories.yml"));
}

export async function loadVenues(): Promise<Venue[]> {
  const files = await findYamlFiles(join(dataDir, "venues"));
  const venueGroups = await Promise.all(files.map((file) => readYamlArray<Venue>(file)));
  return venueGroups.flat();
}

export async function loadDeadlineRecords(): Promise<LoadedDeadlineRecord[]> {
  const files = await findYamlFiles(join(dataDir, "deadlines"));
  const recordGroups = await Promise.all(
    files.map(async (file) => {
      const records = await readYamlArray<DeadlineRecord>(file);
      return records.map((record) => ({ ...record, sourceFile: file }));
    }),
  );
  return recordGroups.flat();
}

export async function loadSources(): Promise<SourceDefinition[]> {
  return readYamlArray<SourceDefinition>(join(dataDir, "sources.yml"));
}

export function categoryIds(categories: CategoryGroup[]): {
  primaryIds: Set<string>;
  allIds: Set<string>;
} {
  const primaryIds = new Set<string>();
  const allIds = new Set<string>();

  for (const category of categories) {
    primaryIds.add(category.id);
    allIds.add(category.id);
    for (const child of category.children ?? []) {
      allIds.add(child.id);
    }
  }

  return { primaryIds, allIds };
}

export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
