import type {
  AdapterInput,
  ExtractedDeadlineCandidate,
  SourceAdapter,
} from "./types";

const monthNames =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const isoDatePattern = /\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g;
const monthDatePattern = new RegExp(
  `\\b(${monthNames})\\s+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?[,]?\\s+(20\\d{2})\\b`,
  "gi",
);
const dateMonthPattern = new RegExp(
  `\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?\\s+(${monthNames})[,]?\\s+(20\\d{2})\\b`,
  "gi",
);

const labelHints: Array<{ label: string; pattern: RegExp }> = [
  { label: "abstract", pattern: /\babstract\b/i },
  { label: "full_paper", pattern: /\b(full|paper|submission|manuscript)\b/i },
  { label: "notification", pattern: /\bnotification|decision\b/i },
  { label: "revision", pattern: /\brevision|revised\b/i },
  { label: "camera_ready", pattern: /\bcamera[-\s]?ready|camera ready\b/i },
  { label: "author_response", pattern: /\bauthor response|rebuttal\b/i },
  { label: "submission_open", pattern: /\bsubmission opens?|submissions open\b/i },
  { label: "final_decision", pattern: /\bfinal decision\b/i },
  { label: "registration", pattern: /\bregistration\b/i },
  { label: "proposal", pattern: /\bproposal\b/i },
];

const monthIndex: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function padDay(day: string): string {
  return day.padStart(2, "0");
}

function normalizeMonth(value: string): string {
  return monthIndex[value.toLowerCase()] ?? value;
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function inferLabel(line: string): string | undefined {
  return labelHints.find((hint) => hint.pattern.test(line))?.label;
}

function inferTimezone(line: string): string | undefined {
  if (/\bAoE\b|Anywhere on Earth/i.test(line)) {
    return "Anywhere on Earth";
  }

  if (/\bUTC\b/i.test(line)) {
    return "UTC";
  }

  return undefined;
}

function splitCandidateLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.length >= 8)
    .filter((line) => /deadline|due|submission|notification|revision|camera|abstract|paper|decision|response|date/i.test(line));
}

function addCandidate(
  candidates: ExtractedDeadlineCandidate[],
  line: string,
  date: string,
  confidence: number,
  sourceAdapter: ExtractedDeadlineCandidate["sourceAdapter"],
): void {
  candidates.push({
    label: inferLabel(line),
    date,
    timezone: inferTimezone(line),
    text: line,
    confidence,
    sourceAdapter,
  });
}

export function scanDateCandidates(
  input: AdapterInput,
  sourceAdapter: ExtractedDeadlineCandidate["sourceAdapter"] = "genericHtmlDateScanner",
  confidenceAdjustment = 0,
): ExtractedDeadlineCandidate[] {
  const candidates: ExtractedDeadlineCandidate[] = [];
  const lines = splitCandidateLines(input.text);

  for (const line of lines) {
    for (const match of line.matchAll(isoDatePattern)) {
      addCandidate(candidates, line, match[0], 0.55 + confidenceAdjustment, sourceAdapter);
    }

    for (const match of line.matchAll(monthDatePattern)) {
      const [, month, day, year] = match;
      addCandidate(
        candidates,
        line,
        `${year}-${normalizeMonth(month)}-${padDay(day)}`,
        0.45 + confidenceAdjustment,
        sourceAdapter,
      );
    }

    for (const match of line.matchAll(dateMonthPattern)) {
      const [, day, month, year] = match;
      addCandidate(
        candidates,
        line,
        `${year}-${normalizeMonth(month)}-${padDay(day)}`,
        0.45 + confidenceAdjustment,
        sourceAdapter,
      );
    }
  }

  return dedupeCandidates(candidates);
}

export function dedupeCandidates(
  candidates: ExtractedDeadlineCandidate[],
): ExtractedDeadlineCandidate[] {
  const seen = new Set<string>();
  const deduped: ExtractedDeadlineCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.label ?? ""}|${candidate.date}|${candidate.text}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped.sort((a, b) => b.confidence - a.confidence || a.date.localeCompare(b.date));
}

export const genericHtmlDateScanner: SourceAdapter = {
  name: "genericHtmlDateScanner",
  extract: (input) => scanDateCandidates(input, "genericHtmlDateScanner", 0),
};
