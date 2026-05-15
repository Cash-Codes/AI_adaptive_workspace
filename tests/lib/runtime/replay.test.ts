import { describe, it, expect } from "vitest";
import { replayRun } from "@/lib/runtime/replay";
import { WorkflowOrchestrator } from "@/lib/runtime/orchestrator";
import { MockLLMProvider } from "@/lib/runtime/mock-provider";
import { ToolRunner } from "@/lib/tools/runner";
import { tools as githubTools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";
import type { LLMResponse } from "@/lib/runtime/llm-provider";

function llmCall(content: LLMResponse["content"], stop_reason = "end_turn"): LLMResponse {
  return {
    content,
    stop_reason,
    model_served: "mock-model",
    request_id: `req-${Math.random().toString(36).slice(2)}`,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

const mockText = (text: string) => ({ type: "text" as const, text });
const mockToolUse = (id: string, name: string, input: unknown) => ({
  type: "tool_use" as const,
  id,
  name,
  input,
});

const REPO = "cash-codes/checkout-service";

function buildRunner() {
  return new ToolRunner({
    mode: "snapshot",
    tools: githubTools,
    snapshot: githubSnapshot,
    ctx: {},
  });
}

describe("replayRun - identical reproduction", () => {
  it("replays a single-step run (text only) to identical events", async () => {
    const provider = new MockLLMProvider([llmCall([mockText("done")])]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const original = await orch.run("Investigate nothing.");

    const replayed = await replayRun(original, { toolRunner: buildRunner() });

    expect(replayed.metadata).toEqual(original.metadata);
    expect(replayed.events).toEqual(original.events);
  });

  it("replays a multi-step run (tool + decision + final answer) identically", async () => {
    const provider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_1", "emit_decision", {
            decision: "investigate_prs",
            label: "Investigate PRs",
            reasoning: "Likeliest source of regression",
            alternatives: ["investigate_commits"],
          }),
        ],
        "tool_use",
      ),
      llmCall([mockToolUse("toolu_2", "get_recent_prs", { repo: REPO, limit: 20 })], "tool_use"),
      llmCall([mockText("PR #142 looks responsible.")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const original = await orch.run("Investigate the regression.");

    const replayed = await replayRun(original, { toolRunner: buildRunner() });

    expect(replayed.metadata).toEqual(original.metadata);
    expect(replayed.events).toEqual(original.events);
  });

  it("preserves event ordering (LLMCall, Decision, ToolCall, LLMCall)", async () => {
    const provider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_d", "emit_decision", {
            decision: "investigate_prs",
            label: "Investigate PRs",
            reasoning: "test",
          }),
        ],
        "tool_use",
      ),
      llmCall([mockToolUse("toolu_t", "get_recent_prs", { repo: REPO, limit: 20 })], "tool_use"),
      llmCall([mockText("done")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const original = await orch.run("hi");

    const replayed = await replayRun(original, { toolRunner: buildRunner() });

    const nonRuntimeTypes = (run: typeof original) =>
      run.events.filter((e) => e.type !== "runtime").map((e) => e.type);

    expect(nonRuntimeTypes(replayed)).toEqual(nonRuntimeTypes(original));
  });

  it("throws a clear error when the recorded run has no LLMCall events", async () => {
    const empty = {
      metadata: { id: "r", created_at: 0, workflow: "test" },
      events: [],
    };
    await expect(replayRun(empty, { toolRunner: buildRunner() })).rejects.toThrow(/no llm_call/i);
  });

  it("throws when the recorded first message isn't a plain string", async () => {
    const malformed = {
      metadata: { id: "r", created_at: 0, workflow: "test" },
      events: [
        {
          type: "llm_call" as const,
          id: "e",
          timestamp: 0,
          request: {
            model: "mock-model",
            system: "",
            messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "x" }] }],
            tools: [],
            params: { temperature: 0, max_tokens: 1 },
          },
          request_hash: "h",
          response: {
            content: [],
            stop_reason: "end_turn",
            model_served: "m",
            request_id: "r",
            usage: { input_tokens: 0, output_tokens: 0 },
          },
        },
      ],
    };
    await expect(replayRun(malformed, { toolRunner: buildRunner() })).rejects.toThrow(/string/i);
  });
});
