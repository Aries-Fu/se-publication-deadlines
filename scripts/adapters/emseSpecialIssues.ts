import { scanDateCandidates } from "./genericHtmlDateScanner";
import type { SourceAdapter } from "./types";

export const emseSpecialIssuesAdapter: SourceAdapter = {
  name: "emseSpecialIssues",
  extract: (input) => scanDateCandidates(input, "emseSpecialIssues", 0.16),
};
