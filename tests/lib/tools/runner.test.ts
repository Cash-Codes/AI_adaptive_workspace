import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ToolRunner } from "@/lib/tools/runner";
import type { Tool, Snapshot } from "@/lib/tools/types";

const ECHO_TOOL: Tool<{ msg: string }, { reply: string }> = {
  name: "echo",
  description: "echo",
  inputSchema: z.object({ msg: z.string() }),
  outputSchema: z.object({ reply: z.string() }),
  execute: async (input) => ({ reply: `live:${input.msg}` }),
};

describe("ToolRunner", () => {
  it("snapshot mode returns the recorded result for matching arguments", async () => {
    const snapshot: Snapshot = {
      echo: [{ arguments: { msg: "hi" }, result: { reply: "snapshot:hi" } }],
    };
    const runner = new ToolRunner({
      mode: "snapshot",
      tools: [ECHO_TOOL],
      snapshot,
      ctx: {},
    });
    expect(await runner.run("echo", { msg: "hi" })).toEqual({
      reply: "snapshot:hi",
    });
  });

  it("snapshot mode matches by canonical-JSON equality (key order irrelevant)", async () => {
    const snapshot: Snapshot = {
      pair: [{ arguments: { a: 1, b: 2 }, result: "ok" }],
    };
    const PAIR_TOOL: Tool<{ a: number; b: number }, string> = {
      name: "pair",
      description: "",
      inputSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.string(),
      execute: async () => "live",
    };
    const runner = new ToolRunner({
      mode: "snapshot",
      tools: [PAIR_TOOL],
      snapshot,
      ctx: {},
    });
    expect(await runner.run("pair", { b: 2, a: 1 })).toBe("ok");
  });

  it("snapshot mode throws when no entry matches the arguments", async () => {
    const runner = new ToolRunner({
      mode: "snapshot",
      tools: [ECHO_TOOL],
      snapshot: { echo: [{ arguments: { msg: "hi" }, result: { reply: "x" } }] },
      ctx: {},
    });
    await expect(runner.run("echo", { msg: "miss" })).rejects.toThrow(
      /no snapshot/i
    );
  });

  it("live mode calls execute and validates output", async () => {
    const runner = new ToolRunner({
      mode: "live",
      tools: [ECHO_TOOL],
      snapshot: {},
      ctx: {},
    });
    expect(await runner.run("echo", { msg: "hi" })).toEqual({
      reply: "live:hi",
    });
  });

  it("throws on unknown tool name", async () => {
    const runner = new ToolRunner({
      mode: "live",
      tools: [ECHO_TOOL],
      snapshot: {},
      ctx: {},
    });
    await expect(runner.run("nope", {})).rejects.toThrow(/unknown tool/i);
  });

  it("throws on invalid input (fails inputSchema parse)", async () => {
    const runner = new ToolRunner({
      mode: "live",
      tools: [ECHO_TOOL],
      snapshot: {},
      ctx: {},
    });
    await expect(runner.run("echo", { msg: 42 })).rejects.toThrow();
  });

  it("throws when snapshot result fails outputSchema parse", async () => {
    const snapshot: Snapshot = {
      echo: [{ arguments: { msg: "hi" }, result: { wrong: "shape" } }],
    };
    const runner = new ToolRunner({
      mode: "snapshot",
      tools: [ECHO_TOOL],
      snapshot,
      ctx: {},
    });
    await expect(runner.run("echo", { msg: "hi" })).rejects.toThrow();
  });
});
