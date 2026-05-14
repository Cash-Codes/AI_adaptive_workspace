import Link from "next/link";
import type { RunMetadata } from "@/lib/storage/json-store";
import { shortId } from "@/lib/format";

export function RunList({ runs }: { runs: RunMetadata[] }) {
  if (runs.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
        <p>No recorded runs yet.</p>
        <p className="mt-2">
          Generate the demo fixture with{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
            npm run demo:run
          </code>
        </p>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
        <tr>
          <th className="px-3 py-2 font-medium">Run ID</th>
          <th className="px-3 py-2 font-medium">Workflow</th>
          <th className="px-3 py-2 font-medium">Created</th>
          <th className="px-3 py-2 font-medium">Base</th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2">
              <Link href={`/runs/${r.id}`} className="font-mono text-blue-600 hover:underline">
                {shortId(r.id)}
              </Link>
            </td>
            <td className="px-3 py-2">{r.workflow}</td>
            <td className="px-3 py-2 font-mono text-xs text-gray-600">
              {new Date(r.created_at).toISOString()}
            </td>
            <td className="px-3 py-2 font-mono text-xs text-gray-500">
              {r.base_run_id ? `${shortId(r.base_run_id)} (fork)` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
