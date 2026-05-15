import { describe, it, expect } from "vitest";
import {
  EventSchema,
  LLMCallRecordSchema,
  ToolCallRecordSchema,
  DecisionEventSchema,
  RuntimeEventSchema,
} from "@/lib/events";

describe("event schemas", () => {
  it("validates a minimal LLMCallRecord", () => {
    const event = {
      type: "llm_call",
      id: "evt_1",
      timestamp: 1715000000000,
      request: {
        model: "claude-opus-4-7",
        system: "You are an agent.",
        messages: [{ role: "user", content: "hi" }],
        tools: [],
        params: { temperature: 0, max_tokens: 1024 },
      },
      request_hash: "abc",
      response: {
        content: [{ type: "text", text: "hello" }],
        stop_reason: "end_turn",
        model_served: "claude-opus-4-7",
        request_id: "req_1",
        usage: { input_tokens: 10, output_tokens: 5 },
      },
    };
    expect(LLMCallRecordSchema.parse(event)).toEqual(event);
  });

  it("validates a ToolCallRecord", () => {
    const event = {
      type: "tool_call",
      id: "evt_2",
      timestamp: 1715000000001,
      tool: "get_recent_prs",
      arguments: { repo: "Cash-Codes/AI-Adaptive-Workspace", limit: 10 },
      arguments_hash: "def",
      result: { output: [{ id: 142, title: "Refactor query" }] },
    };
    expect(ToolCallRecordSchema.parse(event)).toEqual(event);
  });

  it("validates a DecisionEvent", () => {
    const event = {
      type: "decision",
      id: "evt_3",
      timestamp: 1715000000002,
      decision: "investigate_prs",
      label: "Investigate recent PRs",
      reasoning: "Most likely source of regression is recent merges.",
      alternatives: ["investigate_commits", "check_issues"],
    };
    expect(DecisionEventSchema.parse(event)).toEqual(event);
  });

  it("validates a RuntimeEvent (now)", () => {
    const event = {
      type: "runtime",
      id: "evt_4",
      timestamp: 1715000000003,
      kind: "now",
      value: 1715000000003,
    };
    expect(RuntimeEventSchema.parse(event)).toEqual(event);
  });

  it("EventSchema discriminates on type", () => {
    const decision = {
      type: "decision",
      id: "evt_5",
      timestamp: 1,
      decision: "x",
      label: "X",
      reasoning: "r",
    };
    const parsed = EventSchema.parse(decision);
    expect(parsed.type).toBe("decision");
  });

  it("rejects an event with an unknown type", () => {
    const bad = { type: "garbage", id: "x", timestamp: 1 };
    expect(() => EventSchema.parse(bad)).toThrow();
  });

  it("rejects an LLMCallRecord with missing request_hash", () => {
    const bad = {
      type: "llm_call",
      id: "evt_6",
      timestamp: 1,
      request: {
        model: "m",
        system: "s",
        messages: [],
        tools: [],
        params: { temperature: 0, max_tokens: 1 },
      },
      response: {
        content: [],
        stop_reason: "end_turn",
        model_served: "m",
        request_id: "r",
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    };
    expect(() => LLMCallRecordSchema.parse(bad)).toThrow();
  });
});
