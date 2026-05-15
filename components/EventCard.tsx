import { Brain, GitBranch, Wrench } from "lucide-react";
import type { Event } from "@/lib/events";

type Props = {
  event: Exclude<Event, { type: "runtime" }>;
  selected: boolean;
};

const TYPE_META = {
  llm_call: {
    icon: Brain,
    label: "LLM call",
    accent: "border-l-gray-400",
  },
  decision: {
    icon: GitBranch,
    label: "Decision",
    accent: "border-l-blue-500",
  },
  tool_call: {
    icon: Wrench,
    label: "Tool call",
    accent: "border-l-emerald-500",
  },
} as const;

export function EventCard({ event, selected }: Props) {
  const meta = TYPE_META[event.type];
  const Icon = meta.icon;
  const summary = summarize(event);
  return (
    <div
      className={[
        "flex gap-3 border-l-2 p-3 transition-colors",
        meta.accent,
        selected ? "bg-blue-50" : "hover:bg-gray-50",
      ].join(" ")}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {meta.label}
          </span>
          <span className="truncate text-sm font-medium">{summary.title}</span>
        </div>
        {summary.subtitle && (
          <div className="mt-0.5 truncate text-xs text-gray-600">{summary.subtitle}</div>
        )}
      </div>
    </div>
  );
}

function summarize(event: Exclude<Event, { type: "runtime" }>): {
  title: string;
  subtitle?: string;
} {
  if (event.type === "decision") {
    return {
      title: event.label,
      subtitle: event.reasoning,
    };
  }
  if (event.type === "tool_call") {
    return {
      title: event.tool,
      subtitle: JSON.stringify(event.arguments).slice(0, 80),
    };
  }
  return {
    title: `${event.request.model} → ${event.response.stop_reason}`,
    subtitle: `${event.response.usage.input_tokens} in / ${event.response.usage.output_tokens} out`,
  };
}
