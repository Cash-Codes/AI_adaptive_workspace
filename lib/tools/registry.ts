import type { Tool } from "@/lib/tools/types";
import { getRecentPrs } from "@/lib/tools/get-recent-prs";
import { getPrDiff } from "@/lib/tools/get-pr-diff";
import { getPrComments } from "@/lib/tools/get-pr-comments";
import { getCommitHistory } from "@/lib/tools/get-commit-history";

export const tools: Tool[] = [
  getRecentPrs,
  getPrDiff,
  getPrComments,
  getCommitHistory,
];

export const toolsByName: Map<string, Tool> = new Map(
  tools.map((t) => [t.name, t])
);
