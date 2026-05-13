import "server-only";
import { JsonRunStore, type Run, type RunMetadata } from "@/lib/storage/json-store";

function store(): JsonRunStore {
  const dir = process.env.RUNS_DIR ?? "./data/runs";
  return new JsonRunStore(dir);
}

export async function listRuns(): Promise<RunMetadata[]> {
  return store().list();
}

export async function getRun(id: string): Promise<Run> {
  return store().read(id);
}
