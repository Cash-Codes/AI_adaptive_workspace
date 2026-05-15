import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { WorkflowOrchestrator } from "@/lib/runtime/orchestrator";
import { MockLLMProvider } from "@/lib/runtime/mock-provider";
import { ToolRunner } from "@/lib/tools/runner";
import { tools as githubTools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";
import type { LLMResponse } from "@/lib/runtime/llm-provider";

const REPO = "cash-codes/checkout-service";

function llmCall(content: LLMResponse["content"], stop_reason = "end_turn"): LLMResponse {
  return {
    content,
    stop_reason,
    model_served: "mock-model",
    request_id: `req-demo-${Math.random().toString(36).slice(2)}`,
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

async function main() {
  const provider = new MockLLMProvider([
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_1",
          name: "emit_decision",
          input: {
            decision: "investigate_prs",
            label: "Investigate recent PRs",
            reasoning: "Most likely source of regression is recent merged code.",
            alternatives: ["investigate_commits", "check_issues"],
          },
        },
      ],
      "tool_use",
    ),
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_2",
          name: "get_recent_prs",
          input: { repo: REPO, limit: 20 },
        },
      ],
      "tool_use",
    ),
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_3",
          name: "get_pr_diff",
          input: { repo: REPO, pr_id: 142 },
        },
      ],
      "tool_use",
    ),
    llmCall(
      [
        {
          type: "tool_use",
          id: "toolu_4",
          name: "get_pr_comments",
          input: { repo: REPO, pr_id: 142 },
        },
      ],
      "tool_use",
    ),
    llmCall([
      {
        type: "text",
        text: "PR #142 (Refactor user query for performance) likely caused the regression. It removes the cached prepared-statement path, forcing Postgres to re-plan every query — reviewer-1 raised exactly this concern in the PR thread.",
      },
    ]),
  ]);

  const runner = new ToolRunner({
    mode: "snapshot",
    tools: githubTools,
    snapshot: githubSnapshot,
    ctx: {},
  });

  const orch = new WorkflowOrchestrator({
    llm: provider,
    toolRunner: runner,
    model: "claude-sonnet-4-6",
    workflow: "github-investigation",
  });

  const run = await orch.run(
    "Recent PRs to cash-codes/checkout-service have caused performance regressions. Investigate and identify the likely culprit.",
  );

  // Stable id so the file is always at data/runs/demo-run.json and reachable
  // at /runs/demo-run in the UI. The orchestrator-generated uuid is replaced
  // post-hoc; this is a demo fixture, not a real run.
  run.metadata.id = "demo-run";

  const outDir = join(process.cwd(), "data", "runs");
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `${run.metadata.id}.json`);
  writeFileSync(path, JSON.stringify(run, null, 2));
  console.log(`Wrote demo run to ${path}`);
  console.log(`  Run ID: ${run.metadata.id}`);
  console.log(`  Events: ${run.events.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
