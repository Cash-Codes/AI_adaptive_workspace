import { z } from "zod";
import type { Tool } from "@/lib/tools/types";

const Input = z.object({
  repo: z.string(),
  pr_id: z.number().int().positive(),
});

const Comment = z.object({
  id: z.number(),
  user: z.object({ login: z.string() }),
  body: z
    .string()
    .nullable()
    .transform((v) => v ?? ""),
  created_at: z.string(),
});

const Output = z.array(Comment);

export const getPrComments: Tool<z.infer<typeof Input>, z.infer<typeof Output>> = {
  name: "get_pr_comments",
  description:
    "Fetch issue comments on a pull request (general PR discussion, not inline review comments).",
  inputSchema: Input,
  outputSchema: Output,
  execute: async (input, ctx) => {
    const url = `https://api.github.com/repos/${input.repo}/issues/${input.pr_id}/comments`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(ctx.githubToken ? { Authorization: `Bearer ${ctx.githubToken}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(
        `GitHub API error for get_pr_comments(${input.repo}#${input.pr_id}): ${res.status} ${res.statusText}`,
      );
    }
    const data = await res.json();
    return Output.parse(data);
  },
};
