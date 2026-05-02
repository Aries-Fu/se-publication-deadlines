import { scanDateCandidates } from "./genericHtmlDateScanner";
import type { SourceAdapter } from "./types";

export const springerCollectionsAdapter: SourceAdapter = {
  name: "springerCollections",
  extract: (input) => scanDateCandidates(input, "springerCollections", 0.12),
};
