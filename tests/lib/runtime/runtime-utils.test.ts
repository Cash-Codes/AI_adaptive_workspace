import { describe, it, expect } from "vitest";
import { Runtime } from "@/lib/runtime/runtime-utils";
import type { RuntimeEvent } from "@/lib/events";

describe("Runtime - record mode", () => {
  it("now() returns Date.now()-ish value and emits a RuntimeEvent", () => {
    const runtime = new Runtime({ mode: "record" });
    const before = Date.now();
    const t = runtime.now();
    const after = Date.now();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
    expect(runtime.events).toHaveLength(1);
    expect(runtime.events[0].kind).toBe("now");
    expect(runtime.events[0].value).toBe(t);
  });

  it("uuid() returns a unique string each call and records events", () => {
    const runtime = new Runtime({ mode: "record" });
    const a = runtime.uuid();
    const b = runtime.uuid();
    expect(a).not.toBe(b);
    expect(runtime.events).toHaveLength(2);
    expect(runtime.events.map((e) => e.kind)).toEqual(["random_uuid", "random_uuid"]);
  });

  it("event ids and timestamps are themselves recorded values", () => {
    const runtime = new Runtime({ mode: "record" });
    runtime.uuid();
    const evt = runtime.events[0];
    expect(typeof evt.id).toBe("string");
    expect(typeof evt.timestamp).toBe("number");
    expect(evt.id.length).toBeGreaterThan(0);
  });
});

describe("Runtime - replay mode", () => {
  it("now() returns recorded values in order", () => {
    const recorded: RuntimeEvent[] = [
      { type: "runtime", id: "e1", timestamp: 1, kind: "now", value: 100 },
      { type: "runtime", id: "e2", timestamp: 2, kind: "now", value: 200 },
    ];
    const runtime = new Runtime({ mode: "replay", events: recorded });
    expect(runtime.now()).toBe(100);
    expect(runtime.now()).toBe(200);
  });

  it("uuid() returns recorded values in order", () => {
    const recorded: RuntimeEvent[] = [
      { type: "runtime", id: "e1", timestamp: 1, kind: "random_uuid", value: "id-a" },
      { type: "runtime", id: "e2", timestamp: 2, kind: "random_uuid", value: "id-b" },
    ];
    const runtime = new Runtime({ mode: "replay", events: recorded });
    expect(runtime.uuid()).toBe("id-a");
    expect(runtime.uuid()).toBe("id-b");
  });

  it("throws when replay events are exhausted for a kind", () => {
    const runtime = new Runtime({ mode: "replay", events: [] });
    expect(() => runtime.now()).toThrow(/exhausted/i);
  });

  it("throws when next event kind does not match request", () => {
    const recorded: RuntimeEvent[] = [
      { type: "runtime", id: "e1", timestamp: 1, kind: "now", value: 100 },
    ];
    const runtime = new Runtime({ mode: "replay", events: recorded });
    expect(() => runtime.uuid()).toThrow(/kind mismatch/i);
  });
});
