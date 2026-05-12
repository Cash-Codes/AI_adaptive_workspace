import { hashCanonical } from "@/lib/hash";
import type { Event } from "@/lib/events";
import type { LLMProvider, LLMRequest, LLMResponse } from "@/lib/runtime/llm-provider";

export class SnapshotLLMProvider implements LLMProvider {
  private readonly responsesByHash: Map<string, LLMResponse>;

  constructor(events: Event[]) {
    this.responsesByHash = new Map();
    for (const event of events) {
      if (event.type === "llm_call") {
        this.responsesByHash.set(event.request_hash, event.response);
      }
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const hash = hashCanonical(request);
    const response = this.responsesByHash.get(hash);
    if (!response) {
      throw new Error(`No snapshot LLMResponse for request hash ${hash}`);
    }
    return response;
  }
}
