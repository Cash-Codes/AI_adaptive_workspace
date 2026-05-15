import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RunTimeline } from "@/components/RunTimeline";
import type { Event } from "@/lib/events";

const events: Event[] = [
  {
    type: "llm_call",
    id: "llm-1",
    timestamp: 1,
    request: {
      model: "mock",
      system: "",
      messages: [{ role: "user", content: "go" }],
      tools: [],
      params: { temperature: 0, max_tokens: 100 },
    },
    request_hash: "hash1",
    response: {
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      model_served: "mock",
      request_id: "r1",
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  },
  {
    type: "decision",
    id: "dec-1",
    timestamp: 2,
    decision: "investigate_prs",
    label: "Investigate PRs",
    reasoning: "test",
  },
  {
    type: "tool_call",
    id: "tool-1",
    timestamp: 3,
    tool: "get_recent_prs",
    arguments: { repo: "x/y" },
    arguments_hash: "h",
    result: { output: [] },
  },
];

describe("<RunTimeline />", () => {
  it("renders one row per non-runtime event", () => {
    render(<RunTimeline events={events} selectedEventId={null} runId="r" />);
    expect(screen.getByText(/investigate prs/i)).toBeTruthy();
    expect(screen.getByText(/get_recent_prs/i)).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("filters out runtime events from the timeline", () => {
    const withRuntime: Event[] = [
      ...events,
      { type: "runtime", id: "rt-1", timestamp: 4, kind: "now", value: 4 },
    ];
    render(<RunTimeline events={withRuntime} selectedEventId={null} runId="r" />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("marks the selected event with aria-current=true", () => {
    render(<RunTimeline events={events} selectedEventId="dec-1" runId="r" />);
    const selected = screen
      .getAllByRole("link")
      .find((el) => el.getAttribute("aria-current") === "true");
    expect(selected?.textContent).toMatch(/investigate prs/i);
  });
});
