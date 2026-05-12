import type { Event, RuntimeEvent } from "@/lib/events";
import type { Run } from "@/lib/storage/json-store";
import { Runtime } from "@/lib/runtime/runtime-utils";
import { SnapshotLLMProvider } from "@/lib/runtime/snapshot-llm-provider";
import { WorkflowOrchestrator } from "@/lib/runtime/orchestrator";
import type { ToolRunner } from "@/lib/tools/runner";

export type ReplayOptions = {
  toolRunner: ToolRunner;
};

export async function replayRun(recorded: Run, options: ReplayOptions): Promise<Run> {
  const firstLLMCall = recorded.events.find((e: Event) => e.type === "llm_call");
  if (!firstLLMCall || firstLLMCall.type !== "llm_call") {
    throw new Error("Cannot replay: no llm_call event in recorded run");
  }

  const firstMessage = firstLLMCall.request.messages[0];
  if (typeof firstMessage?.content !== "string") {
    throw new Error("Cannot replay: first user message content is not a string");
  }
  const goal = firstMessage.content;

  const llm = new SnapshotLLMProvider(recorded.events);

  const runtimeEvents: RuntimeEvent[] = recorded.events.filter(
    (e: Event): e is RuntimeEvent => e.type === "runtime",
  );
  const runtime = new Runtime({ mode: "replay", events: runtimeEvents });

  const orchestrator = new WorkflowOrchestrator({
    llm,
    toolRunner: options.toolRunner,
    model: firstLLMCall.request.model,
    workflow: recorded.metadata.workflow,
    runtime,
    params: {
      temperature: firstLLMCall.request.params.temperature,
      max_tokens: firstLLMCall.request.params.max_tokens,
    },
  });

  return orchestrator.run(goal);
}
