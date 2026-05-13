import Link from "next/link";
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
              <EventCard event={event} selected={isSelected} />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
