import { randomUUID } from "node:crypto";
import type { RuntimeEvent } from "@/lib/events";

export type RuntimeConfig = { mode: "record" } | { mode: "replay"; events: RuntimeEvent[] };

export class Runtime {
  private readonly mode: "record" | "replay";
  private readonly replayEvents: RuntimeEvent[];
  private replayCursor = 0;

  readonly events: RuntimeEvent[] = [];

  constructor(config: RuntimeConfig) {
    this.mode = config.mode;
    this.replayEvents = config.mode === "replay" ? config.events : [];
  }

  now(): number {
    if (this.mode === "replay") {
      return this.consumeReplay("now") as number;
    }
    const value = Date.now();
    this.recordEvent("now", value);
    return value;
  }

  uuid(): string {
    if (this.mode === "replay") {
      return this.consumeReplay("random_uuid") as string;
    }
    const value = randomUUID();
    this.recordEvent("random_uuid", value);
    return value;
  }

  private recordEvent(kind: RuntimeEvent["kind"], value: unknown): void {
    this.events.push({
      type: "runtime",
      id: randomUUID(),
      timestamp: Date.now(),
      kind,
      value,
    });
  }

  private consumeReplay(expectedKind: RuntimeEvent["kind"]): unknown {
    if (this.replayCursor >= this.replayEvents.length) {
      throw new Error(`Runtime replay events exhausted (expected ${expectedKind})`);
    }
    const event = this.replayEvents[this.replayCursor++];
    if (event.kind !== expectedKind) {
      throw new Error(`Runtime replay kind mismatch: expected ${expectedKind}, got ${event.kind}`);
    }
    return event.value;
  }
}
