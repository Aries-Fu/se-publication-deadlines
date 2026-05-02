import { scanDateCandidates } from "./genericHtmlDateScanner";
import type { SourceAdapter } from "./types";

export const researchrAdapter: SourceAdapter = {
  name: "researchr",
  extract: (input) => scanDateCandidates(input, "researchr", 0.2),
};
