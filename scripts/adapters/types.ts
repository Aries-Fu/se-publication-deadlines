export type SourceAdapterName =
  | "researchr"
  | "springerCollections"
  | "emseSpecialIssues"
  | "genericHtmlDateScanner";

export type SourceKind = "deadline" | "venue" | "workshop" | "special_issue";

export type SourceDefinition = {
  id: string;
  kind: SourceKind;
  recordId?: string;
  venueId?: string;
  adapter?: SourceAdapterName;
  url: string;
  expectedDeadlineLabels?: string[];
  checkFrequency?: "daily" | "weekly" | "monthly";
  notes?: string;
};

export type AdapterInput = {
  source: SourceDefinition;
  url: string;
  html: string;
  text: string;
};

export type ExtractedDeadlineCandidate = {
  label?: string;
  date: string;
  timezone?: string;
  text: string;
  confidence: number;
  sourceAdapter: SourceAdapterName;
};

export type SourceAdapter = {
  name: SourceAdapterName;
  extract: (input: AdapterInput) => ExtractedDeadlineCandidate[];
};
