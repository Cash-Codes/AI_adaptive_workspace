import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { JsonRunStore } from "@/lib/storage/json-store";
import { WorkflowOrchestrator } from "@/lib/runtime/orchestrator";
import { MockLLMProvider } from "@/lib/runtime/mock-provider";
import { ToolRunner } from "@/lib/tools/runner";
import { tools as githubTools } from "@/lib/tools/registry";
import { githubSnapshot } from "@/fixtures/github-snapshot";

// Mock Anthropic provider with a class that wraps MockLLMProvider
vi.mock("@/lib/runtime/anthropic-provider", () => {
  class MockAnthropicLLMProvider {
    private readonly inner = new MockLLMProvider([
      {
        content: [{ type: "text", text: "forked conclusion" }],
        stop_reason: "end_turn",
        model_served: "mock-model",
        request_id: "req-fork-test",
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    ]);
    complete(request: Parameters<typeof this.inner.complete>[0]) {
      return this.inner.complete(request);
    }
  }
  return { AnthropicLLMProvider: MockAnthropicLLMProvider };
});

describe("createFork server action", () => {
  let dir: string;
  let baseId: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(os.tmpdir(), "aw-fork-action-"));
    process.env.RUNS_DIR = dir;
    process.env.ANTHROPIC_API_KEY = "test-key";

    const provider = new MockLLMProvider([
      {
        content: [
          {
            type: "tool_use",
            id: "toolu_dec",
            name: "emit_decision",
            input: {
              decision: "investigate_prs",
              label: "Investigate PRs",
              reasoning: "test",
            },
          },
        ],
        stop_reason: "tool_use",
        model_served: "mock-model",
        request_id: "r1",
        usage: { input_tokens: 1, output_tokens: 1 },
      },
      {
        content: [{ type: "text", text: "done" }],
        stop_reason: "end_turn",
        model_served: "mock-model",
        request_id: "r2",
        usage: { input_tokens: 1, output_tokens: 1 },
      },
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
      model: "mock-model",
      workflow: "test",
    });
    const base = await orch.run("investigate");
    const store = new JsonRunStore(dir);
    await store.write(base);
    baseId = base.metadata.id;
  });

  afterEach(async () => {
    delete process.env.RUNS_DIR;
    delete process.env.ANTHROPIC_API_KEY;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("creates a fork run on disk and returns its id", async () => {
    const { createFork } = await import("@/app/actions/fork");

    const base = await new JsonRunStore(dir).read(baseId);
    const decision = base.events.find((e) => e.type === "decision");
    if (!decision || decision.type !== "decision") throw new Error("expected decision");

    const result = await createFork(baseId, {
      kind: "decision",
      event_id: decision.id,
      new_decision: "investigate_commits",
      new_label: "Investigate commits",
      new_reasoning: "user override",
    });

    expect(typeof result.forkRunId).toBe("string");
    const fork = await new JsonRunStore(dir).read(result.forkRunId);
    expect(fork.metadata.base_run_id).toBe(baseId);
    expect(fork.metadata.fork_point?.event_id).toBe(decision.id);
  });

  it("throws a clear error when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { createFork } = await import("@/app/actions/fork");
    await expect(
      createFork(baseId, {
        kind: "tool_output",
        event_id: "x",
        new_result: "y",
      }),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
