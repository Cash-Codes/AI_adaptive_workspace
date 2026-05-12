import { describe, it, expect } from "vitest";
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
    request_id: `req-${Math.random()}`,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

function mockToolUse(id: string, name: string, input: unknown) {
  return { type: "tool_use" as const, id, name, input };
}

function mockText(text: string) {
  return { type: "text" as const, text };
}

const REPO = "cash-codes/checkout-service";

function buildRunner() {
  return new ToolRunner({
    mode: "snapshot",
    tools: githubTools,
    snapshot: githubSnapshot,
    ctx: {},
  });
}

describe("WorkflowOrchestrator", () => {
  it("runs a single-step workflow (text-only response → terminates)", async () => {
    const provider = new MockLLMProvider([llmCall([mockText("Nothing to investigate.")])]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    const run = await orch.run("Investigate nothing.");

    expect(run.metadata.workflow).toBe("test");
    const llmEvents = run.events.filter((e) => e.type === "llm_call");
    expect(llmEvents).toHaveLength(1);
    expect(provider.requests).toHaveLength(1);
  });

  it("dispatches a regular tool call through the runner and records a ToolCallRecord", async () => {
    const provider = new MockLLMProvider([
      llmCall([mockToolUse("toolu_1", "get_recent_prs", { repo: REPO, limit: 20 })], "tool_use"),
      llmCall([mockText("Found 10 PRs. Done.")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    const run = await orch.run("List PRs.");

    const orderedTypes = run.events.filter((e) => e.type !== "runtime").map((e) => e.type);
    expect(orderedTypes).toEqual(["llm_call", "tool_call", "llm_call"]);

    const toolCall = run.events.find((e) => e.type === "tool_call");
    if (!toolCall || toolCall.type !== "tool_call") throw new Error("expected tool_call");
    expect(toolCall.tool).toBe("get_recent_prs");
    expect(toolCall.arguments).toEqual({ repo: REPO, limit: 20 });
  });

  it("treats emit_decision as a DecisionEvent, not a ToolCallRecord", async () => {
    const provider = new MockLLMProvider([
      llmCall(
        [
          mockToolUse("toolu_2", "emit_decision", {
            decision: "investigate_prs",
            label: "Investigate PRs",
            reasoning: "Likeliest source of regression",
            alternatives: ["investigate_commits"],
          }),
        ],
        "tool_use",
      ),
      llmCall([mockText("Concluded.")]),
    ]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    const run = await orch.run("Decide.");

    const orderedTypes = run.events.filter((e) => e.type !== "runtime").map((e) => e.type);
    expect(orderedTypes).toEqual(["llm_call", "decision", "llm_call"]);

    const decision = run.events.find((e) => e.type === "decision");
    if (!decision || decision.type !== "decision") throw new Error("expected decision");
    expect(decision.decision).toBe("investigate_prs");
    expect(decision.label).toBe("Investigate PRs");
    expect(decision.reasoning).toBe("Likeliest source of regression");
    expect(decision.alternatives).toEqual(["investigate_commits"]);
  });

  it("records request_hash and request bodies on each LLMCallRecord", async () => {
    const provider = new MockLLMProvider([llmCall([mockText("done")])]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    const run = await orch.run("hello");

    const llmCallEvent = run.events.find((e) => e.type === "llm_call");
    if (!llmCallEvent || llmCallEvent.type !== "llm_call") throw new Error("expected llm_call");
    expect(llmCallEvent.request.model).toBe("mock-model");
    expect(llmCallEvent.request_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(llmCallEvent.response.stop_reason).toBe("end_turn");
  });

  it("includes emit_decision in the tool list sent to the LLM", async () => {
    const provider = new MockLLMProvider([llmCall([mockText("ok")])]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    await orch.run("hello");

    const sentTools = provider.requests[0].tools.map((t) => t.name);
    expect(sentTools).toContain("emit_decision");
    expect(sentTools).toContain("get_recent_prs");
  });

  it("attaches latency_ms to each LLMCallRecord diagnostics", async () => {
    const provider = new MockLLMProvider([llmCall([mockText("done")])]);
    const orch = new WorkflowOrchestrator({
      llm: provider,
      toolRunner: buildRunner(),
      model: "mock-model",
      workflow: "test",
    });

    const run = await orch.run("hello");
    const llmEvent = run.events.find((e) => e.type === "llm_call");
    if (!llmEvent || llmEvent.type !== "llm_call") throw new Error("expected llm_call");
    expect(typeof llmEvent.diagnostics?.latency_ms).toBe("number");
    expect(llmEvent.diagnostics?.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
