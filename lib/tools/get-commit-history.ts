import { z } from "zod";
import type { Tool } from "@/lib/tools/types";

const Input = z.object({
  repo: z.string(),
  since: z.string().optional(),
});

const Commit = z.object({
  sha: z.string(),
  commit: z.object({
    message: z.string(),
    author: z.object({ name: z.string(), date: z.string() }),
  }),
});

const Output = z.array(Commit);

export const getCommitHistory: Tool<
  z.infer<typeof Input>,
  z.infer<typeof Output>
> = {
  name: "get_commit_history",
  description:
    "List commits on the default branch, optionally filtered by `since` (ISO 8601 timestamp).",
  inputSchema: Input,
  outputSchema: Output,
  execute: async (input, ctx) => {
    const params = new URLSearchParams();
    if (input.since) params.set("since", input.since);
    const url = `https://api.github.com/repos/${input.repo}/commits?${params.toString()}`;
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
        `GitHub API error for get_commit_history(${input.repo}): ${res.status} ${res.statusText}`
      );
    }
    const data = await res.json();
    return Output.parse(data);
  },
};
