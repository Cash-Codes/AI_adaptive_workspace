import { z } from "zod";
import type { Tool } from "@/lib/tools/types";

const Input = z.object({
  repo: z.string(),
  limit: z.number().int().positive().optional(),
});

const PRSummary = z.object({
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().transform((v) => v ?? ""),
  state: z.string(),
  user: z.object({ login: z.string() }),
  created_at: z.string(),
  head: z.object({ sha: z.string() }),
  base: z.object({ sha: z.string() }),
});

const Output = z.array(PRSummary);

export const getRecentPrs: Tool<z.infer<typeof Input>, z.infer<typeof Output>> = {
  name: "get_recent_prs",
  description:
    "List recent pull requests for a GitHub repo. Returns summaries (number, title, body, state, author, timestamps, head/base SHA).",
  inputSchema: Input,
  outputSchema: Output,
  execute: async (input, ctx) => {
    const limit = input.limit ?? 30;
    const url = `https://api.github.com/repos/${input.repo}/pulls?state=all&per_page=${limit}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(ctx.githubToken
          ? { Authorization: `Bearer ${ctx.githubToken}` }
          : {}),
      },
    });
    if (!res.ok) {
      throw new Error(
        `GitHub API error for get_recent_prs(${input.repo}): ${res.status} ${res.statusText}`
      );
    }
    const data = await res.json();
    return Output.parse(data);
  },
};
