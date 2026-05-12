import type { ToolDefinition } from "@/lib/events";
import type { Tool } from "@/lib/tools/types";

export const emitDecisionTool: ToolDefinition = {
  name: "emit_decision",
  description: [
    "Declare an explicit decision point in your investigation.",
    "Call this BEFORE fetching information that depends on a choice you just made,",
    "so the trace records why you went one way and not another.",
    "Fields:",
    "  decision: stable machine-readable identifier (snake_case), e.g. 'investigate_prs'",
    "  label: short human-readable label",
    "  reasoning: one sentence — why this option, not the alternatives",
    "  alternatives: optional list of other decision identifiers you considered",
  ].join("\n"),
  input_schema: {
    type: "object",
    properties: {
      decision: { type: "string" },
      label: { type: "string" },
      reasoning: { type: "string" },
      alternatives: { type: "array", items: { type: "string" } },
    },
    required: ["decision", "label", "reasoning"],
  },
};

export function buildSystemPrompt(tools: Tool[]): string {
  const toolDescriptions = tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join("\n");

  return [
    "You are an investigation agent in the Adaptive Workspace runtime.",
    "Your job is to investigate a question by calling tools and explicitly declaring your decisions.",
    "",
    "# Tools available",
    toolDescriptions,
    `- ${emitDecisionTool.name}: ${emitDecisionTool.description}`,
    "",
    "# How to work",
    "1. At each fork in your reasoning, call emit_decision BEFORE calling investigative tools.",
    "2. Call tools to gather evidence.",
    "3. Repeat: emit_decision → call tools → ...",
    "4. When you've reached a conclusion, output a final text message. Do not call more tools.",
  ].join("\n");
}

export function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as unknown,
  };
}
