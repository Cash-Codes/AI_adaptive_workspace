import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { forkRun } from "@/lib/runtime/fork";
import { MockLLMProvider } from "@/lib/runtime/mock-provider";
import { ToolRunner } from "@/lib/tools/runner";
import { tools as githubTools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";
import { RunSchema } from "@/lib/storage/json-store";
import type { LLMResponse } from "@/lib/runtime/llm-provider";

const REPO = "cash-codes/checkout-service";

function llmCall(content: LLMResponse["content"], stop_reason = "end_turn"): LLMResponse {
  return {
    content,
    stop_reason,
    model_served: "mock-model",
    request_id: `req-fork-${Math.random().toString(36).slice(2)}`,
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

async function main() {
  const basePath = join(process.cwd(), "data", "runs", "demo-run.json");
  const base = RunSchema.parse(JSON.parse(readFileSync(basePath, "utf8")));

  // The fork edits the get_pr_diff(142) tool result so it looks benign.
  // The agent should then investigate alternative culprits.
  const targetToolCall = base.events.find(
    (e) =>
      e.type === "tool_call" &&
      e.tool === "get_pr_diff" &&
      JSON.stringify(e.arguments).includes('"pr_id":142'),
  );
  if (!targetToolCall) {
    throw new Error("Could not find get_pr_diff(142) tool_call in demo-run");
  }

  const forkLLM = new MockLLMProvider([
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_fork_1",
          name: "get_pr_diff",
          input: { repo: REPO, pr_id: 138 },
        },
      ],
      "tool_use",
    ),
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_fork_2",
          name: "get_pr_comments",
          input: { repo: REPO, pr_id: 138 },
        },
      ],
      "tool_use",
    ),
    llmCall([
      {
        type: "text",
        text: "With the DB-change signal removed from #142, the leading suspect becomes PR #138 (Redis caching layer). Reviewer-2 flagged its 5-minute TTL — under load, this could surface as elevated tail latency from cache misses.",
      },
    ]),
  ]);

  const runner = new ToolRunner({
    mode: "snapshot",
    tools: githubTools,
    snapshot: githubSnapshot,
    ctx: {},
  });

  const fork = await forkRun(
    base,
    {
      kind: "tool_output",
      event_id: targetToolCall.id,
      new_result:
        "diff --git a/src/queries/user.ts b/src/queries/user.ts\n(benign: rename only, no semantic change)\n",
    },
    { toolRunner: runner, llm: forkLLM },
  );

  fork.metadata.id = "demo-fork"; // stable id for the demo URL

  const outDir = join(process.cwd(), "data", "runs");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "demo-fork.json"), JSON.stringify(fork, null, 2));
  console.log(`Wrote demo fork to data/runs/demo-fork.json`);
  console.log(`  Base: ${fork.metadata.base_run_id}`);
  console.log(`  Fork point: ${fork.metadata.fork_point?.event_id}`);
  console.log(`  Events: ${fork.events.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
