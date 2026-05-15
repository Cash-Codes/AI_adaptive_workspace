import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventInspector } from "@/components/EventInspector";
import type { Event } from "@/lib/events";

describe("<EventInspector />", () => {
  it("renders the empty-state message when no event is selected", () => {
    render(<EventInspector event={null} />);
    expect(screen.getByText(/click an event/i)).toBeTruthy();
  });

  it("renders decision detail with label, reasoning, alternatives", () => {
    const event: Event = {
      type: "decision",
      id: "dec-1",
      timestamp: 1,
      decision: "investigate_prs",
      label: "Investigate PRs",
      reasoning: "Most likely source",
      alternatives: ["investigate_commits", "check_issues"],
    };
    render(<EventInspector event={event} />);
    expect(screen.getByText("Investigate PRs")).toBeTruthy();
    expect(screen.getByText(/most likely source/i)).toBeTruthy();
    expect(screen.getByText("investigate_commits")).toBeTruthy();
  });

  it("renders tool call detail with arguments and result", () => {
    const event: Event = {
      type: "tool_call",
      id: "t-1",
      timestamp: 1,
      tool: "get_recent_prs",
      arguments: { repo: "x/y", limit: 20 },
      arguments_hash: "h",
      result: { output: [{ id: 1 }] },
    };
    render(<EventInspector event={event} />);
    expect(screen.getByText(/get_recent_prs/)).toBeTruthy();
    expect(screen.getByText(/arguments/i)).toBeTruthy();
    expect(screen.getByText(/result/i)).toBeTruthy();
  });

  it("renders LLM call detail with model, request hash and token usage", () => {
    const event: Event = {
      type: "llm_call",
      id: "l-1",
      timestamp: 1,
      request: {
        model: "claude-sonnet-4-6",
        system: "be helpful",
        messages: [{ role: "user", content: "hi" }],
        tools: [],
        params: { temperature: 0, max_tokens: 100 },
      },
      request_hash: "abc123",
      response: {
        content: [{ type: "text", text: "hello" }],
        stop_reason: "end_turn",
        model_served: "claude-sonnet-4-6",
        request_id: "r1",
        usage: { input_tokens: 50, output_tokens: 10 },
      },
    };
    render(<EventInspector event={event} />);
    expect(screen.getByText(/claude-sonnet-4-6/)).toBeTruthy();
    expect(screen.getByText(/abc123/)).toBeTruthy();
    // Token grid renders "50" and "10" separately
    expect(screen.getByText(/50/)).toBeTruthy();
    expect(screen.getByText(/10/)).toBeTruthy();
  });
});
