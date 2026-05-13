"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/lib/events";
import type { Run } from "@/lib/storage/json-store";
import { EventCard } from "@/components/EventCard";

type Props = { base: Run; fork: Run };

type TypedEvent = Exclude<Event, { type: "runtime" }>;

type Pair = {
  base: TypedEvent | null;
  fork: TypedEvent | null;
  divergent: boolean;
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
      pairs.push({ base: bi, fork: fi, divergent: true });
    } else {
      pairs.push({ base: bi, fork: fi, divergent: false });
    }
  }
  return pairs;
}

export function SideBySideRunView({ base, fork }: Props) {
  const params = useSearchParams();
  const selectedId = params?.get("event") ?? null;
  const pairs = align(base, fork);

  return (
    <div className="border-t border-gray-200">
      <div className="grid grid-cols-2">
        <h2 className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
          Base — {base.metadata.id}
        </h2>
        <h2 className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-600">
          Fork — {fork.metadata.id}
        </h2>
      </div>
      <ol className="divide-y divide-gray-100">
        {pairs.map((p, i) => (
          <li key={i}>
            {p.divergent && (
              <div className="bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                Divergence point
              </div>
            )}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div>
                {p.base && (
                  <CardCell event={p.base} runId={base.metadata.id} selectedId={selectedId} />
                )}
              </div>
              <div>
                {p.fork && (
                  <CardCell event={p.fork} runId={fork.metadata.id} selectedId={selectedId} />
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CardCell({
  event,
  runId,
  selectedId,
}: {
  event: TypedEvent;
  runId: string;
  selectedId: string | null;
}) {
  const isSelected = event.id === selectedId;
  return (
    <Link
      href={`/runs/${runId}?event=${event.id}`}
      aria-current={isSelected ? "true" : undefined}
      scroll={false}
      className="block"
    >
      <EventCard event={event} selected={isSelected} />
    </Link>
  );
}
