import { z } from "zod";
import type { Tool } from "@/lib/tools/types";

const Input = z.object({
  repo: z.string(),
  pr_id: z.number().int().positive(),
});

const Output = z.string();

export const getPrDiff: Tool<z.infer<typeof Input>, z.infer<typeof Output>> = {
  name: "get_pr_diff",
  description: "Fetch the raw unified diff (`diff --git ...`) for a given pull request.",
  inputSchema: Input,
  outputSchema: Output,
  execute: async (input, ctx) => {
    const url = `https://api.github.com/repos/${input.repo}/pulls/${input.pr_id}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3.diff",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(ctx.githubToken ? { Authorization: `Bearer ${ctx.githubToken}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(
        `GitHub API error for get_pr_diff(${input.repo}#${input.pr_id}): ${res.status} ${res.statusText}`,
      );
    }
    const text = await res.text();
    return Output.parse(text);
  },
};
