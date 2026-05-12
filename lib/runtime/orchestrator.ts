import { hashCanonical } from "@/lib/hash";
import type {
  ContentBlock,
  DecisionEvent,
  Event,
  LLMCallRecord,
  Message,
  ToolCallRecord,
  ToolDefinition,
} from "@/lib/events";
import type { Run } from "@/lib/storage/json-store";
import type { LLMProvider, LLMRequest } from "@/lib/runtime/llm-provider";
import type { ToolRunner } from "@/lib/tools/runner";
import { Runtime } from "@/lib/runtime/runtime-utils";
import { buildSystemPrompt, emitDecisionTool, toolToDefinition } from "@/lib/runtime/system-prompt";
import type { Tool } from "@/lib/tools/types";

export type WorkflowOrchestratorConfig = {
  llm: LLMProvider;
  toolRunner: ToolRunner;
  model: string;
  workflow: string;
  tools?: Tool[];
  runtime?: Runtime;
  params?: { temperature?: number; max_tokens?: number };
};

type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

type DecisionInput = {
  decision: string;
  label: string;
  reasoning: string;
  alternatives?: string[];
};

function isToolUse(block: ContentBlock): block is ToolUseBlock {
  return block.type === "tool_use";
}

const MAX_ITERATIONS = 32;

export class WorkflowOrchestrator {
  private readonly llm: LLMProvider;
  private readonly toolRunner: ToolRunner;
  private readonly model: string;
  private readonly workflow: string;
  private readonly userTools: Tool[];
  private readonly runtime: Runtime;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: WorkflowOrchestratorConfig) {
    this.llm = config.llm;
    this.toolRunner = config.toolRunner;
    this.model = config.model;
    this.workflow = config.workflow;
    this.userTools = config.tools ?? this.toolRunner.tools;
    this.runtime = config.runtime ?? new Runtime({ mode: "record" });
    this.temperature = config.params?.temperature ?? 0;
    this.maxTokens = config.params?.max_tokens ?? 4096;
  }

  async run(goal: string): Promise<Run> {
    const events: Event[] = [];
    const runId = this.runtime.uuid();
    const createdAt = this.runtime.now();

    const system = buildSystemPrompt(this.userTools);
    const toolDefinitions: ToolDefinition[] = [
      ...this.userTools.map(toolToDefinition),
      emitDecisionTool,
    ];

    const messages: Message[] = [{ role: "user", content: goal }];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const request: LLMRequest = {
        model: this.model,
        system,
        messages,
        tools: toolDefinitions,
        params: {
          temperature: this.temperature,
          max_tokens: this.maxTokens,
        },
      };
      const requestHash = hashCanonical(request);

      const startedAt = Date.now();
      const response = await this.llm.complete(request);
      const latency = Date.now() - startedAt;

      const llmCall: LLMCallRecord = {
        type: "llm_call",
        id: this.runtime.uuid(),
        timestamp: this.runtime.now(),
        request,
        request_hash: requestHash,
        response,
        diagnostics: { latency_ms: latency },
      };
      events.push(llmCall);

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter(isToolUse);
      if (toolUses.length === 0) {
        break;
      }

      const toolResultsForLLM: ContentBlock[] = [];
      for (const block of toolUses) {
        if (block.name === emitDecisionTool.name) {
          const input = block.input as DecisionInput;
          const decision: DecisionEvent = {
            type: "decision",
            id: this.runtime.uuid(),
            timestamp: this.runtime.now(),
            decision: input.decision,
            label: input.label,
            reasoning: input.reasoning,
            alternatives: input.alternatives,
          };
          events.push(decision);
          toolResultsForLLM.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Decision recorded.",
          });
        } else {
          const result = await this.toolRunner.run(block.name, block.input);
          const args = block.input as Record<string, unknown>;
          const toolCall: ToolCallRecord = {
            type: "tool_call",
            id: this.runtime.uuid(),
            timestamp: this.runtime.now(),
            tool: block.name,
            arguments: args,
            arguments_hash: hashCanonical(args),
            result: { output: result },
          };
          events.push(toolCall);
          toolResultsForLLM.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      messages.push({ role: "user", content: toolResultsForLLM });
    }

    events.push(...this.runtime.events);

    return {
      metadata: {
        id: runId,
        created_at: createdAt,
        workflow: this.workflow,
      },
      events,
    };
  }
}
