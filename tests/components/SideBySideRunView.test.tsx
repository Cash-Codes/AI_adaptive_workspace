import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SideBySideRunView } from "@/components/SideBySideRunView";
import type { Run } from "@/lib/storage/json-store";

const baseRun: Run = {
  metadata: { id: "base", created_at: 0, workflow: "test" },
  events: [
    {
      type: "decision",
      id: "d1",
      timestamp: 1,
      decision: "investigate_prs",
      label: "Investigate PRs",
      reasoning: "r",
    },
    {
      type: "tool_call",
      id: "t1",
      timestamp: 2,
      tool: "get_pr_diff",
      arguments: { repo: "x/y", pr_id: 142 },
      arguments_hash: "h",
      result: { output: "original-diff" },
    },
  ],
};

const forkRunFixture: Run = {
  metadata: {
    id: "fork",
    created_at: 10,
    workflow: "test",
    base_run_id: "base",
    fork_point: { event_id: "t1" },
  },
  events: [
    baseRun.events[0],
    {
      ...baseRun.events[1],
      result: { output: "edited-diff" },
    } as Run["events"][number],
    {
      type: "tool_call",
      id: "t2-fork",
      timestamp: 3,
      tool: "get_pr_diff",
      arguments: { repo: "x/y", pr_id: 138 },
      arguments_hash: "h",
      result: { output: "fork-diff" },
    },
  ],
};

describe("<SideBySideRunView />", () => {
  it("renders both columns with their headers", () => {
    render(<SideBySideRunView base={baseRun} fork={forkRunFixture} />);
    expect(screen.getByText(/base - base/i)).toBeTruthy();
    expect(screen.getByText(/fork - fork/i)).toBeTruthy();
  });

  it("renders pre-fork events in both columns (same id)", () => {
    render(<SideBySideRunView base={baseRun} fork={forkRunFixture} />);
    const decisions = screen.getAllByText(/investigate prs/i);
    expect(decisions.length).toBeGreaterThanOrEqual(2);
  });

  it("marks the divergence point on the first event with edited or non-matching id", () => {
    render(<SideBySideRunView base={baseRun} fork={forkRunFixture} />);
    expect(screen.getByText(/divergence/i)).toBeTruthy();
  });
});
