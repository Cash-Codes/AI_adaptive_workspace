import Link from "next/link";
import { getRun } from "@/lib/server/runs";
import { RunDetail } from "@/components/RunDetail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Runs
        </Link>
        <h1 className="mt-2 font-mono text-lg">{run.metadata.id}</h1>
        <p className="text-sm text-gray-600">
          {run.metadata.workflow} · {new Date(run.metadata.created_at).toISOString()}
        </p>
      </header>
      <RunDetail run={run} />
    </main>
  );
}
