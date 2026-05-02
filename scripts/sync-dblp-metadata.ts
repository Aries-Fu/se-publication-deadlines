import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadVenues, rootDir, type Venue } from "./data-utils";

const dblpVenueApi = "https://dblp.org/search/venue/api";
const defaultOutputPath = join(rootDir, "data", "external", "dblp-venues.json");
const defaultHitCount = 5;

type CliOptions = {
  dryRun: boolean;
  hitCount: number;
  outputPath: string;
};

type DblpCandidate = {
  title: string;
  url?: string;
  key?: string;
  type?: string;
  score?: number;
};

type DblpSuggestion = {
  venueId: string;
  name: string;
  shortName: string;
  type: Venue["type"];
  queries: string[];
  bestCandidate?: DblpCandidate & {
    confidence: number;
    confidenceReason: string;
  };
  candidates: DblpCandidate[];
};

type DblpSuggestionsFile = {
  source: {
    name: string;
    api: string;
    documentation: string;
    license: string;
  };
  policy: {
    mode: string;
    note: string;
  };
  items: DblpSuggestion[];
};

function parseArgs(): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    hitCount: defaultHitCount,
    outputPath: defaultOutputPath,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--h=")) {
      options.hitCount = Number(arg.slice("--h=".length));
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.outputPath = join(rootDir, arg.slice("--out=".length));
    }
  }

  if (!Number.isInteger(options.hitCount) || options.hitCount < 1 || options.hitCount > 20) {
    throw new Error("--h must be an integer between 1 and 20");
  }

  return options;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactCandidate(candidate: DblpCandidate): string {
  return [candidate.title, candidate.key, candidate.url].filter(Boolean).join(" ");
}

function dedupeCandidates(candidates: DblpCandidate[]): DblpCandidate[] {
  const seen = new Set<string>();
  const deduped: DblpCandidate[] = [];

  for (const candidate of candidates) {
    const key = normalize(compactCandidate(candidate));

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function scoreCandidate(venue: Venue, candidate: DblpCandidate): {
  confidence: number;
  confidenceReason: string;
} {
  const title = normalize(candidate.title);
  const shortName = normalize(venue.shortName);
  const name = normalize(venue.name);
  const key = normalize(candidate.key);
  const url = normalize(candidate.url);
  const venueId = normalize(venue.id);

  if (title === shortName || title === name) {
    return { confidence: 0.98, confidenceReason: "exact title match" };
  }

  if (title.includes(name) || name.includes(title)) {
    return { confidence: 0.9, confidenceReason: "full name match" };
  }

  if (shortName && title.includes(shortName)) {
    return { confidence: 0.82, confidenceReason: "short name appears in title" };
  }

  if (venueId && (key.includes(venueId) || url.includes(venueId))) {
    return { confidence: 0.72, confidenceReason: "venue id appears in DBLP key or URL" };
  }

  return { confidence: 0.35, confidenceReason: "low-confidence textual match" };
}

function extractCandidate(hit: unknown): DblpCandidate | undefined {
  if (typeof hit !== "object" || hit === null) {
    return undefined;
  }

  const record = hit as Record<string, unknown>;
  const info = record.info;

  if (typeof info !== "object" || info === null) {
    return undefined;
  }

  const infoRecord = info as Record<string, unknown>;
  const title =
    pickString(infoRecord.venue) ??
    pickString(infoRecord.title) ??
    pickString(infoRecord.name);

  if (!title) {
    return undefined;
  }

  const rawScore = record["@score"] ?? record.score;
  const score = typeof rawScore === "string" ? Number(rawScore) : undefined;

  return {
    title,
    url: pickString(infoRecord.url),
    key: pickString(infoRecord.key),
    type: pickString(infoRecord.type),
    score: Number.isFinite(score) ? score : undefined,
  };
}

async function fetchVenueCandidates(query: string, hitCount: number): Promise<DblpCandidate[]> {
  const url = new URL(dblpVenueApi);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("h", String(hitCount));
  url.searchParams.set("c", "0");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "se-publication-deadlines metadata sync (GitHub Actions)",
    },
  });

  if (!response.ok) {
    throw new Error(`DBLP API request failed for "${query}": ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    result?: {
      hits?: {
        hit?: unknown | unknown[];
      };
    };
  };
  const hits = asArray(payload.result?.hits?.hit);

  return hits
    .map((hit) => extractCandidate(hit))
    .filter((candidate): candidate is DblpCandidate => Boolean(candidate));
}

function queriesForVenue(venue: Venue): string[] {
  return Array.from(new Set([venue.shortName, venue.name].filter(Boolean)));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function buildSuggestion(venue: Venue, hitCount: number): Promise<DblpSuggestion> {
  const queries = queriesForVenue(venue);
  const candidateGroups: DblpCandidate[][] = [];

  for (const query of queries) {
    candidateGroups.push(await fetchVenueCandidates(query, hitCount));
    await delay(250);
  }

  const candidates = dedupeCandidates(candidateGroups.flat());
  const scoredCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(venue, candidate),
    }))
    .sort((a, b) => b.score.confidence - a.score.confidence);

  const best = scoredCandidates[0];

  return {
    venueId: venue.id,
    name: venue.name,
    shortName: venue.shortName,
    type: venue.type,
    queries,
    bestCandidate: best
      ? {
          ...best.candidate,
          confidence: best.score.confidence,
          confidenceReason: best.score.confidenceReason,
        }
      : undefined,
    candidates,
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const venues = await loadVenues();
  const items: DblpSuggestion[] = [];

  for (const venue of venues) {
    items.push(await buildSuggestion(venue, options.hitCount));
  }

  const output: DblpSuggestionsFile = {
    source: {
      name: "dblp computer science bibliography",
      api: dblpVenueApi,
      documentation: "https://dblp.org/faq/How%2Bto%2Buse%2Bthe%2Bdblp%2Bsearch%2BAPI.html",
      license: "CC0 1.0",
    },
    policy: {
      mode: "suggestions_only",
      note: "This file is generated from DBLP venue search results. Review suggestions manually before changing authoritative YAML data.",
    },
    items,
  };

  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  if (options.dryRun) {
    process.stdout.write(serialized);
    return;
  }

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, serialized, "utf8");
  console.log(`Wrote DBLP venue metadata suggestions for ${items.length} venues to ${options.outputPath}`);
}

void main();
