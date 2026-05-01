export type VenueType = "conference" | "journal";
export type DeadlineRecordType = "conference" | "special_issue";
export type DeadlineStatus = "open" | "closed" | "tentative";

export type DeadlineLabel =
  | "abstract"
  | "full_paper"
  | "submission"
  | "submission_open"
  | "author_response"
  | "notification"
  | "revision"
  | "camera_ready"
  | "final_decision"
  | "registration"
  | "proposal";

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
  core?: "A*" | "A" | "B" | "C";
  ccf?: "A" | "B" | "C";
  jcrQuartile?: "Q1" | "Q2" | "Q3" | "Q4";
};

export type Metrics = {
  impactFactor?: number;
  jcrQuartile?: "Q1" | "Q2" | "Q3" | "Q4";
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

export type DeadlineRow = {
  id: string;
  recordId: string;
  venueId: string;
  venue: Venue;
  title: string;
  recordType: DeadlineRecordType;
  status: DeadlineStatus;
  categories: CategorySelection;
  links?: Record<string, string>;
  rank: Rank;
  source: Source;
  notes?: string;
  deadlineLabel: DeadlineLabel;
  deadlineDescription?: string;
  deadlineDate: string;
  timezone: string;
};

export type GeneratedData = {
  generatedAt: string;
  categories: CategoryGroup[];
  venues: Venue[];
  records: DeadlineRecord[];
  deadlineRows: DeadlineRow[];
};

export type FiltersState = {
  search: string;
  primaryCategory: string;
  secondaryCategory: string;
  venueType: string;
  deadlineLabel: string;
  status: string;
  ranking: string;
  favoritesOnly: boolean;
};

export type SortKey =
  | "nearest"
  | "latest"
  | "venue"
  | "core"
  | "ccf"
  | "jcr"
  | "impactFactor";

export type ViewMode = "table" | "cards" | "timeline";
