import Link from "next/link";
import { Brain } from "lucide-react";
import type { Event } from "@/lib/events";
import { EventCard } from "@/components/EventCard";

type Props = {
  events: Event[];
  selectedEventId: string | null;
  runId: string;
};

export function RunTimeline({ events, selectedEventId, runId }: Props) {
  const typed = events.filter((e) => e.type !== "runtime") as Exclude<Event, { type: "runtime" }>[];

  if (typed.length === 0) {
    return <div className="p-6 text-sm text-gray-600">This run has no events.</div>;
  }

  return (
    <ol className="divide-y divide-gray-100">
      {typed.map((event) => {
        const isSelected = event.id === selectedEventId;
        return (
          <li key={event.id}>
            <Link
              href={`/runs/${runId}?event=${event.id}`}
              aria-current={isSelected ? "true" : undefined}
              scroll={false}
              className="block"
            >
              {event.type === "llm_call" ? (
                <CompactLLMCall event={event} selected={isSelected} />
              ) : (
                <EventCard event={event} selected={isSelected} />
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function CompactLLMCall({
  event,
  selected,
}: {
  event: Extract<Event, { type: "llm_call" }>;
  selected: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 transition-colors",
        selected ? "bg-blue-50 text-gray-700" : "hover:bg-gray-50",
      ].join(" ")}
    >
      <Brain className="h-3 w-3 flex-shrink-0" />
      <span className="font-mono">{event.request.model}</span>
      <span className="text-gray-400">·</span>
      <span>{event.response.stop_reason}</span>
      <span className="text-gray-400">·</span>
      <span>
        {event.response.usage.input_tokens}/{event.response.usage.output_tokens} tokens
      </span>
    </div>
  );
}
