import type { LLMCallRecord } from "@/lib/events";

export type LLMRequest = LLMCallRecord["request"];
export type LLMResponse = LLMCallRecord["response"];

export interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
}
