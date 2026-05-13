"use server";

import { JsonRunStore } from "@/lib/storage/json-store";
import { forkRun, type ForkEdit } from "@/lib/runtime/fork";
import { AnthropicLLMProvider } from "@/lib/runtime/anthropic-provider";
import { ToolRunner } from "@/lib/tools/runner";
import { tools as githubTools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";

export async function createFork(
  baseRunId: string,
  edit: ForkEdit,
): Promise<{ forkRunId: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Cannot create fork: ANTHROPIC_API_KEY env var is not set. Live fork creation requires an API key; without it you can only view existing recorded forks.",
    );
  }

  const runsDir = process.env.RUNS_DIR ?? "./data/runs";
  const store = new JsonRunStore(runsDir);
  const base = await store.read(baseRunId);

  const runner = new ToolRunner({
    mode: "snapshot",
    tools: githubTools,
    snapshot: githubSnapshot,
    ctx: { githubToken: process.env.GITHUB_TOKEN },
  });

  const llm = new AnthropicLLMProvider({ apiKey });

  const fork = await forkRun(base, edit, { toolRunner: runner, llm });
  await store.write(fork);

  return { forkRunId: fork.metadata.id };
}
