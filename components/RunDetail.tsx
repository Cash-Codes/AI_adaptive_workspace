"use client";

import { useSearchParams } from "next/navigation";
import type { Run } from "@/lib/storage/json-store";
import { RunTimeline } from "@/components/RunTimeline";
import { EventInspector } from "@/components/EventInspector";

export function RunDetail({ run }: { run: Run }) {
  const params = useSearchParams();
  const selectedId = params?.get("event") ?? null;
  const selected = run.events.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-[1fr_400px] gap-0 border-t border-gray-200">
      <div className="border-r border-gray-200">
        <RunTimeline events={run.events} selectedEventId={selectedId} runId={run.metadata.id} />
      </div>
      <div className="overflow-auto p-4">
        <EventInspector event={selected} baseRunId={run.metadata.id} />
      </div>
    </div>
  );
}
