import { canonicalJSONStringify } from "@/lib/hash";
import type { Tool, ToolContext, ToolRunMode, Snapshot } from "@/lib/tools/types";

export type ToolRunnerConfig = {
  mode: ToolRunMode;
  tools: Tool[];
  snapshot: Snapshot;
  ctx: ToolContext;
};

export class ToolRunner {
  private readonly mode: ToolRunMode;
  private readonly toolsByName: Map<string, Tool>;
  private readonly snapshot: Snapshot;
  private readonly ctx: ToolContext;

  constructor(config: ToolRunnerConfig) {
    this.mode = config.mode;
    this.toolsByName = new Map(config.tools.map((t) => [t.name, t]));
    this.snapshot = config.snapshot;
    this.ctx = config.ctx;
  }

  async run(name: string, rawArgs: unknown): Promise<unknown> {
    const tool = this.toolsByName.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const input = tool.inputSchema.parse(rawArgs);

    const rawResult =
      this.mode === "snapshot"
        ? this.lookupSnapshot(name, input)
        : await tool.execute(input, this.ctx);

    return tool.outputSchema.parse(rawResult);
  }

  private lookupSnapshot(name: string, input: unknown): unknown {
    const entries = this.snapshot[name] ?? [];
    const target = canonicalJSONStringify(input);
    const match = entries.find((e) => canonicalJSONStringify(e.arguments) === target);
    if (!match) {
      throw new Error(`No snapshot entry for ${name} matching arguments ${target}`);
    }
    return match.result;
  }
}
