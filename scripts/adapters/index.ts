import { emseSpecialIssuesAdapter } from "./emseSpecialIssues";
import { genericHtmlDateScanner } from "./genericHtmlDateScanner";
import { researchrAdapter } from "./researchr";
import { springerCollectionsAdapter } from "./springerCollections";
import type { SourceAdapter, SourceAdapterName } from "./types";

const adapters: Record<SourceAdapterName, SourceAdapter> = {
  researchr: researchrAdapter,
  springerCollections: springerCollectionsAdapter,
  emseSpecialIssues: emseSpecialIssuesAdapter,
  genericHtmlDateScanner,
};

export function adapterFor(name: SourceAdapterName | undefined): SourceAdapter {
  return adapters[name ?? "genericHtmlDateScanner"] ?? genericHtmlDateScanner;
}

export type {
  ExtractedDeadlineCandidate,
  SourceAdapterName,
  SourceDefinition,
  SourceKind,
} from "./types";
