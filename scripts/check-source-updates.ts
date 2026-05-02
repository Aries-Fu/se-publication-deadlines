import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { adapterFor, type ExtractedDeadlineCandidate, type SourceDefinition } from "./adapters";
import { readYamlArray, rootDir } from "./data-utils";

const sourcesPath = join(rootDir, "data", "sources.yml");
const outputDir = join(rootDir, "data", "external", "source-pages");
const statePath = join(outputDir, "state.json");
const candidatesPath = join(outputDir, "candidates.json");
const reportPath = join(outputDir, "report.md");

type SourceStateItem = {
  sourceId: string;
  url: string;
  adapter: string;
  status: "ok" | "error";
  contentHash?: string;
  firstSeenAt?: string;
  lastChangedAt?: string;
  lastError?: string;
};

type SourceStateFile = {
  generatedAt: string | null;
  items: SourceStateItem[];
};

type CandidateReportItem = {
  sourceId: string;
  recordId?: string;
  venueId?: string;
  url: string;
  adapter: string;
  changed: boolean;
  status: "ok" | "error";
  contentHash?: string;
  previousHash?: string;
  lastChangedAt?: string;
  error?: string;
  candidates: ExtractedDeadlineCandidate[];
};

type CandidatesFile = {
  generatedAt: string | null;
  policy: {
    mode: "suggestions_only";
    note: string;
  };
  items: CandidateReportItem[];
};

function stableCandidateSignature(candidates: ExtractedDeadlineCandidate[]): string {
  return JSON.stringify(
    candidates.map((candidate) => ({
      label: candidate.label,
      date: candidate.date,
      timezone: candidate.timezone,
      text: candidate.text,
      confidence: Number(candidate.confidence.toFixed(2)),
      sourceAdapter: candidate.sourceAdapter,
    })),
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|tr|td|th|h[1-6]|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForHash(html: string): string {
  return stripHtml(html)
    .replace(/\bupdated\s*:?\s*\d{4}-\d{2}-\d{2}\b/gi, "updated: DATE")
    .replace(/\b(last\s+modified|last\s+updated)\s*:?\s+[^\n]+/gi, "$1: NORMALIZED")
    .replace(/\s+/g, " ")
    .trim();
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeTextIfChanged(path: string, content: string): Promise<void> {
  let current: string | undefined;

  try {
    current = await readFile(path, "utf8");
  } catch {
    current = undefined;
  }

  if (current === content) {
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function fetchHtml(source: SourceDefinition): Promise<string> {
  const response = await fetch(source.url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "se-publication-deadlines source monitor (GitHub Actions)",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function renderCandidate(candidate: ExtractedDeadlineCandidate): string {
  const label = candidate.label ? ` ${candidate.label}` : "";
  const timezone = candidate.timezone ? ` (${candidate.timezone})` : "";
  return `- ${candidate.date}${label}${timezone}, confidence ${candidate.confidence.toFixed(2)}: ${candidate.text}`;
}

function renderReport(items: CandidateReportItem[]): string {
  const changed = items.filter((item) => item.changed);
  const errored = items.filter((item) => item.status === "error");

  const lines = [
    "# Source Page Update Report",
    "",
    "This report is generated automatically from `data/sources.yml`.",
    "",
    "The extracted dates are suggestions only. Review source pages manually before editing authoritative YAML data.",
    "",
    `Changed pages: ${changed.length}`,
    `Errors: ${errored.length}`,
    "",
  ];

  for (const item of items) {
    lines.push(`## ${item.sourceId}`);
    lines.push("");
    lines.push(`- URL: ${item.url}`);
    lines.push(`- Adapter: ${item.adapter}`);
    lines.push(`- Status: ${item.status}`);
    lines.push(`- Changed: ${item.changed ? "yes" : "no"}`);

    if (item.previousHash && item.contentHash && item.previousHash !== item.contentHash) {
      lines.push(`- Previous hash: ${item.previousHash}`);
      lines.push(`- Current hash: ${item.contentHash}`);
    } else if (item.contentHash) {
      lines.push(`- Hash: ${item.contentHash}`);
    }

    if (item.lastChangedAt) {
      lines.push(`- Last changed: ${item.lastChangedAt}`);
    }

    if (item.error) {
      lines.push(`- Error: ${item.error}`);
    }

    lines.push("");

    if (item.candidates.length > 0) {
      lines.push("Candidate deadline-like dates:");
      lines.push("");
      lines.push(...item.candidates.slice(0, 12).map((candidate) => renderCandidate(candidate)));
    } else {
      lines.push("No deadline-like dates were extracted.");
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main(): Promise<void> {
  const now = new Date().toISOString();
  const sources = await readYamlArray<SourceDefinition>(sourcesPath);
  const previousState = await readJsonFile<SourceStateFile>(statePath, {
    generatedAt: null,
    items: [],
  });
  const previousCandidates = await readJsonFile<CandidatesFile>(candidatesPath, {
    generatedAt: null,
    policy: {
      mode: "suggestions_only",
      note: "This file contains source-page monitoring output and low-confidence date extraction suggestions. Review manually before editing data/deadlines/*.yml.",
    },
    items: [],
  });
  const previousById = new Map(previousState.items.map((item) => [item.sourceId, item]));
  const previousCandidatesById = new Map(
    previousCandidates.items.map((item) => [item.sourceId, item]),
  );
  const stateItems: SourceStateItem[] = [];
  const candidateItems: CandidateReportItem[] = [];
  let hasObservableChanges = false;

  for (const source of sources) {
    const adapter = adapterFor(source.adapter);
    const previous = previousById.get(source.id);

    try {
      const html = await fetchHtml(source);
      const text = stripHtml(html);
      const contentHash = sha256(normalizeForHash(html));
      const changed = previous?.contentHash !== contentHash;
      const lastChangedAt = changed ? now : previous?.lastChangedAt;
      const candidates = adapter.extract({
        source,
        url: source.url,
        html,
        text,
      });
      const previousCandidateItem = previousCandidatesById.get(source.id);
      const candidatesChanged =
        stableCandidateSignature(candidates) !==
        stableCandidateSignature(previousCandidateItem?.candidates ?? []);
      const observedChange = changed || candidatesChanged || previous?.status === "error";
      const persistentChanged = observedChange || previousCandidateItem?.changed === true;
      hasObservableChanges = hasObservableChanges || observedChange;

      stateItems.push({
        sourceId: source.id,
        url: source.url,
        adapter: adapter.name,
        status: "ok",
        contentHash,
        firstSeenAt: previous?.firstSeenAt ?? now,
        lastChangedAt,
      });

      candidateItems.push({
        sourceId: source.id,
        recordId: source.recordId,
        venueId: source.venueId,
        url: source.url,
        adapter: adapter.name,
        changed: persistentChanged,
        status: "ok",
        contentHash,
        previousHash: previous?.contentHash,
        lastChangedAt,
        candidates,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const observedChange = previous?.status !== "error" || previous?.lastError !== message;
      hasObservableChanges = hasObservableChanges || observedChange;

      stateItems.push({
        sourceId: source.id,
        url: source.url,
        adapter: adapter.name,
        status: "error",
        contentHash: previous?.contentHash,
        firstSeenAt: previous?.firstSeenAt ?? now,
        lastChangedAt: previous?.lastChangedAt,
        lastError: message,
      });

      candidateItems.push({
        sourceId: source.id,
        recordId: source.recordId,
        venueId: source.venueId,
        url: source.url,
        adapter: adapter.name,
        changed: true,
        status: "error",
        contentHash: previous?.contentHash,
        previousHash: previous?.contentHash,
        lastChangedAt: previous?.lastChangedAt,
        error: message,
        candidates: [],
      });
    }
  }

  const state: SourceStateFile = {
    generatedAt: hasObservableChanges ? now : previousState.generatedAt,
    items: stateItems.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  };
  const candidates: CandidatesFile = {
    generatedAt: hasObservableChanges ? now : previousCandidates.generatedAt,
    policy: {
      mode: "suggestions_only",
      note: "This file contains source-page monitoring output and low-confidence date extraction suggestions. Review manually before editing data/deadlines/*.yml.",
    },
    items: candidateItems.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  };

  await writeTextIfChanged(statePath, `${JSON.stringify(state, null, 2)}\n`);
  await writeTextIfChanged(candidatesPath, `${JSON.stringify(candidates, null, 2)}\n`);
  await writeTextIfChanged(reportPath, renderReport(candidates.items));

  const changedCount = candidates.items.filter((item) => item.changed).length;
  const errorCount = candidates.items.filter((item) => item.status === "error").length;
  console.log(`Checked ${sources.length} sources. Changed: ${changedCount}. Errors: ${errorCount}.`);
}

void main();
