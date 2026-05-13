"use client";

import { useSearchParams } from "next/navigation";
import type { Run } from "@/lib/storage/json-store";
import { RunTimeline } from "@/components/RunTimeline";

export function RunDetail({ run }: { run: Run }) {
  const params = useSearchParams();
  const selected = params.get("event");

  return (
    <div className="grid grid-cols-[1fr_400px] gap-0 border-t border-gray-200">
      <div className="border-r border-gray-200">
        <RunTimeline events={run.events} selectedEventId={selected} runId={run.metadata.id} />
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-600">
          {selected
            ? `Selected event: ${selected.slice(0, 8)}`
            : "Click an event in the timeline to inspect."}
        </p>
      </div>
    </div>
  );
}
