import { randomUUID } from "node:crypto";
import type { ContentBlock, DecisionEvent, Event, Message, ToolCallRecord } from "@/lib/events";
import type { Run } from "@/lib/storage/json-store";
import { Runtime } from "@/lib/runtime/runtime-utils";
import { WorkflowOrchestrator } from "@/lib/runtime/orchestrator";
import type { LLMProvider } from "@/lib/runtime/llm-provider";
import type { ToolRunner } from "@/lib/tools/runner";
import { emitDecisionTool } from "@/lib/runtime/system-prompt";

export type ForkEdit =
  | { kind: "tool_output"; event_id: string; new_result: unknown }
  | {
      kind: "decision";
      event_id: string;
      new_decision: string;
      new_label?: string;
      new_reasoning?: string;
      new_alternatives?: string[];
    };

export type ForkOptions = {
  toolRunner: ToolRunner;
  llm: LLMProvider;
};

type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

export async function forkRun(base: Run, edit: ForkEdit, options: ForkOptions): Promise<Run> {
  const forkIndex = base.events.findIndex((e) => e.id === edit.event_id);
  if (forkIndex < 0) {
    throw new Error(`fork_point event_id "${edit.event_id}" not found in base run`);
  }
  const forkPointEvent = base.events[forkIndex];
  if (edit.kind === "tool_output" && forkPointEvent.type !== "tool_call") {
    throw new Error(
      `edit kind "tool_output" targets event_id ${edit.event_id}, but its type is ${forkPointEvent.type}`,
    );
  }
  if (edit.kind === "decision" && forkPointEvent.type !== "decision") {
    throw new Error(
      `edit kind "decision" targets event_id ${edit.event_id}, but its type is ${forkPointEvent.type}`,
    );
  }

  const { messages, prefixEvents, model, params } = rebuildStateUpToFork(base, forkIndex, edit);

  const runId = randomUUID();
  const createdAt = Date.now();
  const runtime = new Runtime({ mode: "record" });

  const firstLLMCall = base.events.find((e) => e.type === "llm_call");
  if (!firstLLMCall || firstLLMCall.type !== "llm_call") {
    throw new Error("Cannot fork: no llm_call in base");
  }
  const firstMessage = firstLLMCall.request.messages[0];
  if (typeof firstMessage?.content !== "string") {
    throw new Error("Cannot fork: first user message content is not a string");
  }
  const goal = firstMessage.content;

  const orchestrator = new WorkflowOrchestrator({
    llm: options.llm,
    toolRunner: options.toolRunner,
    model,
    workflow: base.metadata.workflow,
    runtime,
    params,
  });

  const result = await orchestrator.run(goal, {
    initialState: { messages, events: prefixEvents, runId, createdAt },
  });

  return {
    ...result,
    metadata: {
      ...result.metadata,
      base_run_id: base.metadata.id,
      fork_point: { event_id: edit.event_id },
    },
  };
}

function rebuildStateUpToFork(
  base: Run,
  forkIndex: number,
  edit: ForkEdit,
): {
  messages: Message[];
  prefixEvents: Event[];
  model: string;
  params: { temperature: number; max_tokens: number };
} {
  const firstLLMCall = base.events.find((e) => e.type === "llm_call");
  if (!firstLLMCall || firstLLMCall.type !== "llm_call") {
    throw new Error("Cannot fork: no llm_call in base");
  }
  const goal = firstLLMCall.request.messages[0].content as string;
  const model = firstLLMCall.request.model;
  const params = {
    temperature: firstLLMCall.request.params.temperature,
    max_tokens: firstLLMCall.request.params.max_tokens,
  };

  const messages: Message[] = [{ role: "user", content: goal }];
  const prefixEvents: Event[] = [];

  let pendingToolResults: ContentBlock[] = [];

  for (let i = 0; i <= forkIndex; i++) {
    const event = base.events[i];
    if (event.type === "runtime") continue;

    if (event.type === "llm_call") {
      if (pendingToolResults.length > 0) {
        messages.push({ role: "user", content: pendingToolResults });
        pendingToolResults = [];
      }
      messages.push({ role: "assistant", content: event.response.content });
      prefixEvents.push(event);
    } else if (event.type === "tool_call") {
      const isForkPoint = i === forkIndex;
      const effective: ToolCallRecord =
        isForkPoint && edit.kind === "tool_output"
          ? { ...event, result: { output: edit.new_result } }
          : event;
      prefixEvents.push(effective);

      const lastAssistant = messages[messages.length - 1];
      if (!lastAssistant || lastAssistant.role !== "assistant") {
        throw new Error("Cannot rebuild: tool_call without preceding assistant turn");
      }
      const toolUse = (lastAssistant.content as ContentBlock[]).find(
        (b): b is ToolUseBlock => b.type === "tool_use" && b.name === event.tool,
      );
      if (!toolUse) {
        throw new Error(`Cannot rebuild: no matching tool_use for tool ${event.tool}`);
      }
      pendingToolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(effective.result.output),
      });
    } else if (event.type === "decision") {
      const isForkPoint = i === forkIndex;
      const effective: DecisionEvent =
        isForkPoint && edit.kind === "decision"
          ? {
              ...event,
              decision: edit.new_decision,
              label: edit.new_label ?? event.label,
              reasoning: edit.new_reasoning ?? event.reasoning,
              alternatives: edit.new_alternatives ?? event.alternatives,
            }
          : event;
      prefixEvents.push(effective);

      if (isForkPoint && edit.kind === "decision") {
        const lastAssistant = messages[messages.length - 1];
        if (!lastAssistant || lastAssistant.role !== "assistant") {
          throw new Error("Cannot rebuild: decision without preceding assistant turn");
        }
        const blocks = lastAssistant.content as ContentBlock[];
        const updatedBlocks = blocks.map((b): ContentBlock => {
          if (b.type === "tool_use" && b.name === emitDecisionTool.name) {
            return {
              ...b,
              input: {
                decision: effective.decision,
                label: effective.label,
                reasoning: effective.reasoning,
                alternatives: effective.alternatives,
              },
            };
          }
          return b;
        });
        messages[messages.length - 1] = {
          role: "assistant",
          content: updatedBlocks,
        };
      }

      const lastAssistant = messages[messages.length - 1];
      const toolUse = (lastAssistant.content as ContentBlock[]).find(
        (b): b is ToolUseBlock => b.type === "tool_use" && b.name === emitDecisionTool.name,
      );
      if (!toolUse) {
        throw new Error("Cannot rebuild: no matching emit_decision tool_use");
      }
      pendingToolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: "Decision recorded.",
      });
    }
  }

  if (pendingToolResults.length > 0) {
    messages.push({ role: "user", content: pendingToolResults });
  }

  return { messages, prefixEvents, model, params };
}
