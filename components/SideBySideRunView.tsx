"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/lib/events";
import type { Run } from "@/lib/storage/json-store";
import { EventCard } from "@/components/EventCard";
import { EventInspector } from "@/components/EventInspector";

type Props = { base: Run; fork: Run };

type Side = "base" | "fork";

type TypedEvent = Exclude<Event, { type: "runtime" }>;

type Pair = {
  base: TypedEvent | null;
  fork: TypedEvent | null;
  // True only for the FIRST pair where divergence is detected (so the
  // "Divergence point" banner appears exactly once).
  divergent: boolean;
  // True for every pair at or after the divergence point - drives the
  // amber background tint on both cells, making the post-fork area
  // visible at a glance.
  postFork: boolean;
  // True when both sides have the same event id but content was edited
  // (the fork point itself). Distinguished from divergent-by-different-ids
  // so the banner can label it.
  edited: boolean;
};

function typedEvents(run: Run): TypedEvent[] {
  return run.events.filter((e) => e.type !== "runtime") as TypedEvent[];
}

function align(base: Run, fork: Run): Pair[] {
  const b = typedEvents(base);
  const f = typedEvents(fork);
  const len = Math.max(b.length, f.length);
  const pairs: Pair[] = [];
  let diverged = false;
  for (let i = 0; i < len; i++) {
    const bi = b[i] ?? null;
    const fi = f[i] ?? null;
    const sameId = bi && fi && bi.id === fi.id;
    const sameContent = sameId && JSON.stringify(bi) === JSON.stringify(fi);
    if (!diverged && (!sameId || !sameContent) && (bi || fi)) {
      diverged = true;
      pairs.push({
        base: bi,
        fork: fi,
        divergent: true,
        postFork: true,
        edited: Boolean(sameId && !sameContent),
      });
    } else {
      pairs.push({
        base: bi,
        fork: fi,
        divergent: false,
        postFork: diverged,
        edited: false,
      });
    }
  }
  return pairs;
}

export function SideBySideRunView({ base, fork }: Props) {
  const params = useSearchParams();
  const selectedEventId = params?.get("event") ?? null;
  const selectedSide = (params?.get("side") as Side | null) ?? null;
  const pairs = align(base, fork);

  // Resolve the selected event by (id, side). Same id can exist on both
  // sides (pre-fork events are copied verbatim; the fork point keeps the
  // same id with edited content), so the side discriminator matters.
  let selectedEvent: TypedEvent | null = null;
  let selectedRunId: string = fork.metadata.id;
  if (selectedEventId && selectedSide) {
    for (const p of pairs) {
      if (selectedSide === "base" && p.base?.id === selectedEventId) {
        selectedEvent = p.base;
        selectedRunId = base.metadata.id;
        break;
      }
      if (selectedSide === "fork" && p.fork?.id === selectedEventId) {
        selectedEvent = p.fork;
        selectedRunId = fork.metadata.id;
        break;
      }
    }
  }

  return (
    <div className="border-t border-gray-200">
      <div className="grid grid-cols-2">
        <h2 className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
          Base - {base.metadata.id}
        </h2>
        <h2 className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
          Fork - {fork.metadata.id}
        </h2>
      </div>
      <ol className="divide-y divide-gray-100">
        {pairs.map((p, i) => (
          <li key={i}>
            {p.divergent && (
              <div className="bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Divergence point {p.edited && "- edited"}
              </div>
            )}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className={p.postFork ? "bg-amber-50" : ""}>
                {p.base && (
                  <CardCell
                    event={p.base}
                    side="base"
                    forkRunId={fork.metadata.id}
                    selectedEventId={selectedEventId}
                    selectedSide={selectedSide}
                  />
                )}
              </div>
              <div className={p.postFork ? "bg-amber-50" : ""}>
                {p.fork && (
                  <CardCell
                    event={p.fork}
                    side="fork"
                    forkRunId={fork.metadata.id}
                    selectedEventId={selectedEventId}
                    selectedSide={selectedSide}
                  />
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* Inspector panel - same component the single-run view uses, swaps
          content based on which cell was clicked. Stays on the same page
          (no navigation), so the side-by-side timeline remains visible. */}
      <div className="border-t border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Inspector
          {selectedEvent && selectedSide && (
            <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">
              · {selectedSide === "base" ? "from base" : "from fork"}
            </span>
          )}
        </div>
        <div className="p-4">
          <EventInspector event={selectedEvent} baseRunId={selectedRunId} />
        </div>
      </div>
    </div>
  );
}

function CardCell({
  event,
  side,
  forkRunId,
  selectedEventId,
  selectedSide,
}: {
  event: TypedEvent;
  side: Side;
  forkRunId: string;
  selectedEventId: string | null;
  selectedSide: Side | null;
}) {
  const isSelected = event.id === selectedEventId && side === selectedSide;
  return (
    <Link
      // Always stays on the fork's page (the side-by-side host), so clicks
      // from either column update the inspector without losing the side-by-
      // side context.
      href={`/runs/${forkRunId}?event=${event.id}&side=${side}`}
      aria-current={isSelected ? "true" : undefined}
      scroll={false}
      className="block"
    >
      <EventCard event={event} selected={isSelected} />
    </Link>
  );
}
