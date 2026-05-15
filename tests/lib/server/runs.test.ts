import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { listRuns, getRun } from "@/lib/server/runs";
import { JsonRunStore, type Run } from "@/lib/storage/json-store";

describe("server runs loader", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(os.tmpdir(), "aw-server-runs-"));
    process.env.RUNS_DIR = dir;
  });

  afterEach(async () => {
    delete process.env.RUNS_DIR;
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("listRuns() returns metadata for all runs reverse-chronologically", async () => {
    const store = new JsonRunStore(dir);
    await store.write({
      metadata: { id: "a", created_at: 1, workflow: "test" },
      events: [],
    });
    await store.write({
      metadata: { id: "b", created_at: 2, workflow: "test" },
      events: [],
    });
    const list = await listRuns();
    expect(list.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("getRun(id) returns the full run with events", async () => {
    const store = new JsonRunStore(dir);
    const run: Run = {
      metadata: { id: "run_x", created_at: 1, workflow: "test" },
      events: [
        {
          type: "decision",
          id: "e1",
          timestamp: 1,
          decision: "go",
          label: "Go",
          reasoning: "test",
        },
      ],
    };
    await store.write(run);
    expect(await getRun("run_x")).toEqual(run);
  });

  it("getRun throws when the run does not exist", async () => {
    await expect(getRun("missing")).rejects.toThrow();
  });
});
