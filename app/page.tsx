import { listRuns } from "@/lib/server/runs";
import { RunList } from "@/components/RunList";

export default async function Page() {
  const runs = await listRuns();
  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Adaptive Workspace</h1>
        <p className="text-sm text-gray-600">Recorded agent runs</p>
      </header>
      <RunList runs={runs} />
    </main>
  );
}
