"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFork } from "@/app/actions/fork";
import type { Event } from "@/lib/events";

type EditableEvent = Extract<Event, { type: "tool_call" } | { type: "decision" }>;

type Props = {
  event: EditableEvent;
  baseRunId: string;
};

export function ForkEditPanel({ event, baseRunId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (event.type === "tool_call") {
    return (
      <ToolOutputForkForm
        event={event}
        baseRunId={baseRunId}
        open={open}
        setOpen={setOpen}
        pending={pending}
        error={error}
        setError={setError}
        startTransition={startTransition}
        router={router}
      />
    );
  }
  return (
    <DecisionForkForm
      event={event}
      baseRunId={baseRunId}
      open={open}
      setOpen={setOpen}
      pending={pending}
      error={error}
      setError={setError}
      startTransition={startTransition}
      router={router}
    />
  );
}

type FormCommonProps = {
  baseRunId: string;
  open: boolean;
  setOpen: (b: boolean) => void;
  pending: boolean;
  error: string | null;
  setError: (s: string | null) => void;
  startTransition: (fn: () => void) => void;
  router: ReturnType<typeof useRouter>;
};

function ToolOutputForkForm({
  event,
  ...rest
}: FormCommonProps & { event: Extract<Event, { type: "tool_call" }> }) {
  const [value, setValue] = useState(JSON.stringify(event.result.output, null, 2));

  const onSubmit = () => {
    rest.setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value; // accept raw strings (e.g. diffs)
    }
    rest.startTransition(async () => {
      try {
        const { forkRunId } = await createFork(rest.baseRunId, {
          kind: "tool_output",
          event_id: event.id,
          new_result: parsed,
        });
        rest.router.push(`/runs/${forkRunId}`);
      } catch (err) {
        rest.setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <ForkPanelShell {...rest} title="Edit tool output and fork" onSubmit={onSubmit}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        className="w-full rounded border border-gray-300 p-2 font-mono text-xs"
      />
    </ForkPanelShell>
  );
}

function DecisionForkForm({
  event,
  ...rest
}: FormCommonProps & { event: Extract<Event, { type: "decision" }> }) {
  const [decision, setDecision] = useState(event.decision);
  const [label, setLabel] = useState(event.label);
  const [reasoning, setReasoning] = useState(event.reasoning);

  const onSubmit = () => {
    rest.setError(null);
    rest.startTransition(async () => {
      try {
        const { forkRunId } = await createFork(rest.baseRunId, {
          kind: "decision",
          event_id: event.id,
          new_decision: decision,
          new_label: label,
          new_reasoning: reasoning,
        });
        rest.router.push(`/runs/${forkRunId}`);
      } catch (err) {
        rest.setError(err instanceof Error ? err.message : String(err));
      }
    });
  };

  return (
    <ForkPanelShell {...rest} title="Edit decision and fork" onSubmit={onSubmit}>
      <Field label="Decision id">
        <input
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
        />
      </Field>
      <Field label="Label">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </Field>
      <Field label="Reasoning">
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={3}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        />
      </Field>
    </ForkPanelShell>
  );
}

function ForkPanelShell({
  title,
  open,
  setOpen,
  pending,
  error,
  onSubmit,
  children,
}: FormCommonProps & {
  title: string;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 border-t border-gray-200 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium uppercase tracking-wide text-blue-600 hover:underline"
      >
        {open ? "Cancel" : title}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {children}
          {error && (
            <p className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {pending ? "Creating fork…" : "Create fork"}
          </button>
        </div>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}
