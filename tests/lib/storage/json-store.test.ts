import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JsonRunStore, type Run } from "@/lib/storage/json-store";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import os from "node:os";

describe("JsonRunStore", () => {
  let dir: string;
  let store: JsonRunStore;

  beforeEach(async () => {
    dir = await fs.mkdtemp(join(os.tmpdir(), "aw-store-"));
    store = new JsonRunStore(dir);
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("writes and reads a run round-trip", async () => {
    const run: Run = {
      metadata: { id: "run_1", created_at: 1, workflow: "test" },
      events: [
        {
          type: "decision",
          id: "e1",
          timestamp: 1,
          decision: "go",
          label: "Go",
          reasoning: "because",
        },
      ],
    };
    await store.write(run);
    const read = await store.read("run_1");
    expect(read).toEqual(run);
  });

  it("lists runs in reverse-chronological order", async () => {
    await store.write({
      metadata: { id: "a", created_at: 1, workflow: "x" },
      events: [],
    });
    await store.write({
      metadata: { id: "b", created_at: 2, workflow: "x" },
      events: [],
    });
    const list = await store.list();
    expect(list.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("returns an empty list when no runs exist", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("validates events on read (rejects malformed events)", async () => {
    const path = join(dir, "bad.json");
    await fs.writeFile(
      path,
      JSON.stringify({
        metadata: { id: "bad", created_at: 1, workflow: "x" },
        events: [{ type: "garbage", id: "x", timestamp: 1 }],
      }),
    );
    await expect(store.read("bad")).rejects.toThrow();
  });

  it("preserves fork metadata", async () => {
    const run: Run = {
      metadata: {
        id: "fork_1",
        created_at: 5,
        workflow: "test",
        base_run_id: "run_1",
        fork_point: { event_id: "e1" },
      },
      events: [],
    };
    await store.write(run);
    const read = await store.read("fork_1");
    expect(read.metadata.base_run_id).toBe("run_1");
    expect(read.metadata.fork_point).toEqual({ event_id: "e1" });
  });
});
