import { describe, it, expect } from "vitest";
import { forkRun } from "@/lib/runtime/fork";
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

describe("forkRun — diverges from base after the fork point", () => {
  it("forks on a tool output and produces diverged events", async () => {
    const baseProvider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_d", "emit_decision", {
            decision: "investigate_prs",
            label: "Investigate PRs",
            reasoning: "Likeliest source",
          }),
        ],
        "tool_use",
      ),
      llmCall([mockToolUse("toolu_t", "get_pr_diff", { repo: REPO, pr_id: 142 })], "tool_use"),
      llmCall([mockText("PR #142 caused it.")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: baseProvider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const base = await orch.run("Investigate.");

    const toolCall = base.events.find((e) => e.type === "tool_call" && e.tool === "get_pr_diff");
    if (!toolCall || toolCall.type !== "tool_call")
      throw new Error("expected get_pr_diff tool_call");

    const forkProvider = new MockLLMProvider([
      llmCall([mockToolUse("toolu_t2", "get_pr_diff", { repo: REPO, pr_id: 138 })], "tool_use"),
      llmCall([mockText("PR #138 looks responsible after all.")]),
    ]);
    const fork = await forkRun(
      base,
      {
        kind: "tool_output",
        event_id: toolCall.id,
        new_result: "diff --git ... (benign change, no DB impact)",
      },
      {
        toolRunner: buildRunner(),
        llm: forkProvider,
      },
    );

    expect(fork.metadata.base_run_id).toBe(base.metadata.id);
    expect(fork.metadata.fork_point?.event_id).toBe(toolCall.id);

    const baseTypedEvents = base.events.filter((e) => e.type !== "runtime");
    const forkTypedEvents = fork.events.filter((e) => e.type !== "runtime");
    const forkIndex = baseTypedEvents.findIndex((e) => e.id === toolCall.id);
    expect(forkIndex).toBeGreaterThanOrEqual(0);

    for (let i = 0; i < forkIndex; i++) {
      expect(forkTypedEvents[i]).toEqual(baseTypedEvents[i]);
    }
    const editedEvent = forkTypedEvents[forkIndex];
    if (editedEvent.type !== "tool_call") throw new Error("expected tool_call");
    expect(editedEvent.id).toBe(toolCall.id);
    expect(editedEvent.result.output).toBe("diff --git ... (benign change, no DB impact)");

    const baseLLMHashes = base.events
      .filter((e) => e.type === "llm_call")
      .map((e) => (e.type === "llm_call" ? e.request_hash : ""));
    const forkLLMHashes = fork.events
      .filter((e) => e.type === "llm_call")
      .map((e) => (e.type === "llm_call" ? e.request_hash : ""));
    expect(forkLLMHashes[2]).not.toBe(baseLLMHashes[2]);

    const forkToolCalls = fork.events.filter(
      (e) => e.type === "tool_call" && e.tool === "get_pr_diff",
    );
    expect(forkToolCalls).toHaveLength(2);
  });

  it("forks on a decision event and routes through the edited decision", async () => {
    const baseProvider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_d", "emit_decision", {
            decision: "investigate_prs",
            label: "Investigate PRs",
            reasoning: "Likeliest",
          }),
        ],
        "tool_use",
      ),
      llmCall([mockText("Decided to investigate PRs and stop.")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: baseProvider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const base = await orch.run("Investigate.");

    const decision = base.events.find((e) => e.type === "decision");
    if (!decision || decision.type !== "decision") throw new Error("expected decision");

    const forkProvider = new MockLLMProvider([
      llmCall([mockText("Decided differently: check commits.")]),
    ]);
    const fork = await forkRun(
      base,
      {
        kind: "decision",
        event_id: decision.id,
        new_decision: "investigate_commits",
        new_label: "Investigate commits",
        new_reasoning: "user override",
      },
      {
        toolRunner: buildRunner(),
        llm: forkProvider,
      },
    );

    const editedDecision = fork.events.find((e) => e.type === "decision" && e.id === decision.id);
    if (!editedDecision || editedDecision.type !== "decision")
      throw new Error("expected edited decision");
    expect(editedDecision.decision).toBe("investigate_commits");
    expect(editedDecision.reasoning).toBe("user override");

    const baseLLMHashes = base.events
      .filter((e) => e.type === "llm_call")
      .map((e) => (e.type === "llm_call" ? e.request_hash : ""));
    const forkLLMHashes = fork.events
      .filter((e) => e.type === "llm_call")
      .map((e) => (e.type === "llm_call" ? e.request_hash : ""));
    expect(forkLLMHashes[0]).toBe(baseLLMHashes[0]);
    expect(forkLLMHashes[1]).not.toBe(baseLLMHashes[1]);
  });

  it("throws when fork_point event_id is not in the base run", async () => {
    const baseProvider = new MockLLMProvider([llmCall([mockText("done")])]);
    const orch = new WorkflowOrchestrator({
      llm: baseProvider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const base = await orch.run("hello");

    await expect(
      forkRun(
        base,
        { kind: "tool_output", event_id: "nonexistent-id", new_result: "x" },
        { toolRunner: buildRunner(), llm: new MockLLMProvider([]) },
      ),
    ).rejects.toThrow(/fork_point/i);
  });

  it("throws when the edit kind does not match the targeted event type", async () => {
    const baseProvider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_d", "emit_decision", {
            decision: "investigate_prs",
            label: "PRs",
            reasoning: "r",
          }),
        ],
        "tool_use",
      ),
      llmCall([mockText("done")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: baseProvider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });
    const base = await orch.run("hi");
    const decision = base.events.find((e) => e.type === "decision");
    if (!decision || decision.type !== "decision") throw new Error("expected decision");

    await expect(
      forkRun(
        base,
        { kind: "tool_output", event_id: decision.id, new_result: "x" },
        { toolRunner: buildRunner(), llm: new MockLLMProvider([]) },
      ),
    ).rejects.toThrow(/type/i);
  });
});
