import Link from "next/link";
import { getRun } from "@/lib/server/runs";
import { RunDetail } from "@/components/RunDetail";
import { SideBySideRunView } from "@/components/SideBySideRunView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  const isFork = Boolean(run.metadata.base_run_id);
  const base = isFork ? await getRun(run.metadata.base_run_id!) : null;

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Runs
        </Link>
        <h1 className="mt-2 font-mono text-lg">{run.metadata.id}</h1>
        <p className="text-sm text-gray-600">
          {run.metadata.workflow} · {new Date(run.metadata.created_at).toISOString()}
          {isFork && base && (
            <>
              {" "}
              · forked from{" "}
              <Link
                href={`/runs/${base.metadata.id}`}
                className="font-mono text-blue-600 hover:underline"
              >
                {base.metadata.id}
              </Link>
            </>
          )}
        </p>
      </header>
      {isFork && base ? <SideBySideRunView base={base} fork={run} /> : <RunDetail run={run} />}
    </main>
  );
}
