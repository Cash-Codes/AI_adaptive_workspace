import type { Event } from "@/lib/events";
import { JsonViewer } from "@/components/JsonViewer";

export function EventInspector({ event }: { event: Event | null }) {
  if (!event) {
    return <p className="text-sm text-gray-600">Click an event in the timeline to inspect.</p>;
  }

  return (
    <div className="space-y-4">
      <header className="border-b border-gray-200 pb-2">
        <div className="text-xs uppercase tracking-wide text-gray-500">{event.type}</div>
        <div className="font-mono text-xs text-gray-600">{event.id}</div>
      </header>

      {event.type === "decision" && <DecisionView event={event} />}
      {event.type === "tool_call" && <ToolCallView event={event} />}
      {event.type === "llm_call" && <LLMCallView event={event} />}
      {event.type === "runtime" && <RuntimeView event={event} />}
    </div>
  );
}

function DecisionView({ event }: { event: Extract<Event, { type: "decision" }> }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{event.label}</h3>
        <div className="font-mono text-xs text-gray-500">{event.decision}</div>
      </div>
      <Section title="Reasoning">
        <p className="text-sm">{event.reasoning}</p>
      </Section>
      {event.alternatives && event.alternatives.length > 0 && (
        <Section title="Alternatives considered">
          <ul className="space-y-1">
            {event.alternatives.map((alt) => (
              <li key={alt} className="font-mono text-xs text-gray-600">
                {alt}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function ToolCallView({ event }: { event: Extract<Event, { type: "tool_call" }> }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-mono text-sm font-semibold">{event.tool}</h3>
      </div>
      <Section title="Arguments">
        <JsonViewer value={event.arguments} />
      </Section>
      <Section title="Result">
        {event.result.error ? (
          <p className="text-sm text-red-600">{event.result.error}</p>
        ) : (
          <JsonViewer value={event.result.output} />
        )}
      </Section>
    </div>
  );
}

function LLMCallView({ event }: { event: Extract<Event, { type: "llm_call" }> }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-gray-500">Model</div>
          <div className="font-mono">{event.request.model}</div>
        </div>
        <div>
          <div className="text-gray-500">Stop reason</div>
          <div>{event.response.stop_reason}</div>
        </div>
        <div>
          <div className="text-gray-500">Input tokens</div>
          <div>{event.response.usage.input_tokens}</div>
        </div>
        <div>
          <div className="text-gray-500">Output tokens</div>
          <div>{event.response.usage.output_tokens}</div>
        </div>
        <div className="col-span-2">
          <div className="text-gray-500">Request hash</div>
          <div className="truncate font-mono">{event.request_hash}</div>
        </div>
      </div>
      <Section title="System">
        <pre className="overflow-auto rounded bg-gray-50 p-2 text-xs">{event.request.system}</pre>
      </Section>
      <Section title="Messages">
        <JsonViewer value={event.request.messages} />
      </Section>
      <Section title="Response content">
        <JsonViewer value={event.response.content} />
      </Section>
    </div>
  );
}

function RuntimeView({ event }: { event: Extract<Event, { type: "runtime" }> }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">{event.kind}</div>
      <JsonViewer value={event.value} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">{title}</h4>
      {children}
    </section>
  );
}
