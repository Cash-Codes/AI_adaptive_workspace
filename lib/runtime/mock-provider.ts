import type { LLMProvider, LLMRequest, LLMResponse } from "@/lib/runtime/llm-provider";

export class MockLLMProvider implements LLMProvider {
  readonly requests: LLMRequest[] = [];
  private cursor = 0;

  constructor(private readonly scripted: LLMResponse[]) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.requests.push(request);
    if (this.cursor >= this.scripted.length) {
      throw new Error(`MockLLMProvider exhausted after ${this.scripted.length} response(s)`);
    }
    return this.scripted[this.cursor++];
  }
}
