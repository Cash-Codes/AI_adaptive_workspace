import { describe, it, expect } from "vitest";
import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "@/lib/runtime/llm-provider";

describe("LLMProvider contract", () => {
  it("complete() takes an LLMRequest and returns an LLMResponse", async () => {
    const provider: LLMProvider = {
      async complete(req: LLMRequest): Promise<LLMResponse> {
        return {
          content: [{ type: "text", text: `echo: ${req.system}` }],
          stop_reason: "end_turn",
          model_served: req.model,
          request_id: "test-1",
          usage: { input_tokens: 10, output_tokens: 5 },
        };
      },
    };

    const response = await provider.complete({
      model: "claude-sonnet-4-6",
      system: "You are a test agent.",
      messages: [{ role: "user", content: "hello" }],
      tools: [],
      params: { temperature: 0, max_tokens: 1024 },
    });

    expect(response.stop_reason).toBe("end_turn");
    expect(response.model_served).toBe("claude-sonnet-4-6");
  });
});
