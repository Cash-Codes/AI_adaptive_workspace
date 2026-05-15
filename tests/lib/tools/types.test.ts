import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  type Tool,
  type ToolContext,
  type Snapshot,
  type SnapshotEntry,
  SnapshotEntrySchema,
  SnapshotSchema,
} from "@/lib/tools/types";

describe("Tool contract types", () => {
  it("compiles a minimal Tool with input + output schemas and execute", async () => {
    const echo: Tool<{ msg: string }, { reply: string }> = {
      name: "echo",
      description: "Echoes the input message back.",
      inputSchema: z.object({ msg: z.string() }),
      outputSchema: z.object({ reply: z.string() }),
      execute: async (input) => ({ reply: input.msg }),
    };
    const result = await echo.execute({ msg: "hi" }, {} as ToolContext);
    expect(result).toEqual({ reply: "hi" });
  });

  it("validates SnapshotEntry shape", () => {
    const entry: SnapshotEntry = {
      arguments: { repo: "a/b" },
      result: [{ id: 1 }],
    };
    expect(SnapshotEntrySchema.parse(entry)).toEqual(entry);
  });

  it("rejects SnapshotEntry without arguments", () => {
    expect(() => SnapshotEntrySchema.parse({ result: 1 })).toThrow();
  });

  it("validates a Snapshot keyed by tool name", () => {
    const snap: Snapshot = {
      get_recent_prs: [{ arguments: { repo: "a/b" }, result: [] }],
    };
    expect(SnapshotSchema.parse(snap)).toEqual(snap);
  });
});
