import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import { rootDir } from "./data-utils";

type CliOptions = {
  bodyPath?: string;
  issueNumber?: string;
  repo?: string;
  outputDir: string;
};

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
};

type ParsedIssue = {
  fields: Map<string, string>;
  checked: Map<string, string[]>;
};

function parseArgs(): CliOptions {
  const options: CliOptions = {
    outputDir: join(rootDir, "data", "external", "issue-imports"),
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--body=")) {
      options.bodyPath = arg.slice("--body=".length);
      continue;
    }

    if (arg.startsWith("--issue=")) {
      options.issueNumber = arg.slice("--issue=".length);
      continue;
    }

    if (arg.startsWith("--repo=")) {
      options.repo = arg.slice("--repo=".length);
      continue;
    }

    if (arg.startsWith("--out-dir=")) {
      options.outputDir = join(rootDir, arg.slice("--out-dir=".length));
    }
  }

  return options;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseIssueBody(body: string): ParsedIssue {
  const fields = new Map<string, string>();
  const checked = new Map<string, string[]>();
  const headingPattern = /^###\s+(.+?)\s*$/gm;
  const matches = Array.from(body.matchAll(headingPattern));

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const next = matches[index + 1];
    const label = normalizeFieldName(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = next?.index ?? body.length;
    const rawValue = body.slice(start, end).trim();

    fields.set(label, rawValue.replace(/^_No response_$/i, "").trim());

    const checkedValues = rawValue
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^- \[[xX]\]\s+/.test(line))
      .map((line) => line.replace(/^- \[[xX]\]\s+/, "").trim());

    if (checkedValues.length > 0) {
      checked.set(label, checkedValues);
    }
  }

  return { fields, checked };
}

function field(parsed: ParsedIssue, name: string): string {
  return parsed.fields.get(normalizeFieldName(name)) ?? "";
}

function checked(parsed: ParsedIssue, name: string): string[] {
  return parsed.checked.get(normalizeFieldName(name)) ?? [];
}

function parseRanking(value: string): {
  rank?: Record<string, string>;
  metrics?: Record<string, string | number>;
  metricsYear?: number;
} {
  const rank: Record<string, string> = {};
  const metrics: Record<string, string | number> = {};
  let metricsYear: number | undefined;

  for (const line of value.split("\n")) {
    const [rawKey, ...rest] = line.split(":");
    const key = normalizeFieldName(rawKey ?? "");
    const parsedValue = rest.join(":").trim();

    if (!parsedValue) {
      continue;
    }

    if (key === "core") {
      rank.core = parsedValue;
    } else if (key === "ccf") {
      rank.ccf = parsedValue;
    } else if (key === "jcr") {
      rank.jcrQuartile = parsedValue;
      metrics.jcrQuartile = parsedValue;
    } else if (key === "impact factor") {
      const numeric = Number(parsedValue);
      metrics.impactFactor = Number.isFinite(numeric) ? numeric : parsedValue;
    } else if (key === "metrics year") {
      const numeric = Number(parsedValue);
      if (Number.isInteger(numeric)) {
        metricsYear = numeric;
      }
    }
  }

  return {
    rank: Object.keys(rank).length ? rank : undefined,
    metrics: Object.keys(metrics).length ? metrics : undefined,
    metricsYear,
  };
}

function stripEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stripEmpty(item));
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const entries = Object.entries(value)
    .map(([key, nested]) => [key, stripEmpty(nested)] as const)
    .filter(([, nested]) => nested !== undefined && nested !== "");

  const cleaned = Object.fromEntries(entries);
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function parseDeadlineLines(value: string): Array<{
  label: string;
  date: string;
  timezone: string;
}> {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([a-zA-Z_ -]+)\s*:\s*(\d{4}-\d{2}-\d{2})(?:\s*,\s*(.+))?$/);

      if (!match) {
        return undefined;
      }

      return {
        label: match[1].trim().toLowerCase().replace(/[\s-]+/g, "_"),
        date: match[2],
        timezone: match[3]?.trim() || "Anywhere on Earth",
      };
    })
    .filter((deadline): deadline is { label: string; date: string; timezone: string } => Boolean(deadline));
}

function deadlineDraft(parsed: ParsedIssue, issue: GitHubIssue): string {
  const ranking = parseRanking(field(parsed, "Ranking or metrics"));
  const callTitle = field(parsed, "Call title") || issue.title.replace(/^\[Deadline\]:\s*/i, "");
  const record = {
    id: slugify(callTitle),
    venueId: field(parsed, "Venue ID"),
    title: callTitle,
    type: field(parsed, "Record type") || "conference",
    status: field(parsed, "Status") || "tentative",
    deadlines: parseDeadlineLines(field(parsed, "Deadlines")),
    categories: {
      primary: "SE",
      secondary: checked(parsed, "Categories"),
    },
    links: {
      callForPapers: field(parsed, "Official source URL"),
      submission: field(parsed, "Submission URL") || undefined,
    },
    rank: ranking.rank,
    source: {
      url: field(parsed, "Official source URL"),
      checkedDate: field(parsed, "Date checked"),
    },
    notes: [field(parsed, "Notes"), `Imported from ${issue.html_url}`].filter(Boolean).join("\n\n"),
  };

  return yaml.dump([stripEmpty(record)], {
    lineWidth: -1,
    noRefs: true,
    skipInvalid: true,
    sortKeys: false,
  });
}

function journalDraft(parsed: ParsedIssue, issue: GitHubIssue): string {
  const ranking = parseRanking(field(parsed, "Ranking or metrics"));
  const record = {
    id: field(parsed, "Journal ID"),
    name: field(parsed, "Full journal name"),
    shortName: field(parsed, "Short name"),
    type: "journal",
    publisher: field(parsed, "Publisher") || undefined,
    website: field(parsed, "Official website"),
    categories: {
      primary: "SE",
      secondary: checked(parsed, "Categories"),
    },
    ranking: ranking.rank,
    metrics: ranking.metrics,
    metricsYear: ranking.metricsYear,
    notes: [field(parsed, "Notes"), `Imported from ${issue.html_url}`].filter(Boolean).join("\n\n"),
    source: {
      url: field(parsed, "Source URL for metadata"),
      checkedDate: field(parsed, "Date checked"),
    },
  };

  return yaml.dump([stripEmpty(record)], {
    lineWidth: -1,
    noRefs: true,
    skipInvalid: true,
    sortKeys: false,
  });
}

function correctionDraft(parsed: ParsedIssue, issue: GitHubIssue): string {
  return [
    `# Correction draft for issue #${issue.number}`,
    "",
    `Issue: ${issue.html_url}`,
    "",
    `Affected item: ${field(parsed, "Affected item")}`,
    "",
    "Problem:",
    "",
    field(parsed, "What is wrong?"),
    "",
    "Correct value:",
    "",
    field(parsed, "Correct value"),
    "",
    `Source: ${field(parsed, "Source URL")}`,
    `Date checked: ${field(parsed, "Date checked")}`,
    "",
  ].join("\n");
}

function inferDraftKind(parsed: ParsedIssue): "deadline" | "journal" | "correction" {
  if (field(parsed, "Full journal name")) {
    return "journal";
  }

  if (field(parsed, "Affected item")) {
    return "correction";
  }

  return "deadline";
}

async function fetchIssue(repo: string, issueNumber: string): Promise<GitHubIssue> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const response = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "se-publication-deadlines issue importer",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch issue ${repo}#${issueNumber}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as GitHubIssue;
}

async function loadIssue(options: CliOptions): Promise<GitHubIssue> {
  if (options.bodyPath) {
    const body = await readFile(options.bodyPath, "utf8");
    return {
      number: 0,
      title: "Local issue body",
      body,
      html_url: "local-file",
    };
  }

  if (!options.repo || !options.issueNumber) {
    throw new Error("Use --body=path or provide both --repo=owner/repo and --issue=number");
  }

  return fetchIssue(options.repo, options.issueNumber);
}

async function main(): Promise<void> {
  const options = parseArgs();
  const issue = await loadIssue(options);
  const parsed = parseIssueBody(issue.body ?? "");
  const kind = inferDraftKind(parsed);
  const extension = kind === "correction" ? "md" : "yml";
  const fileName = issue.number
    ? `issue-${issue.number}-${kind}-draft.${extension}`
    : `local-${kind}-draft.${extension}`;
  const outputPath = join(options.outputDir, fileName);
  const content =
    kind === "journal"
      ? journalDraft(parsed, issue)
      : kind === "correction"
        ? correctionDraft(parsed, issue)
        : deadlineDraft(parsed, issue);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
  console.log(`Wrote ${kind} draft to ${outputPath}`);
}

void main();
