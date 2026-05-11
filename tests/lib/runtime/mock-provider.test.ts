import { describe, it, expect } from "vitest";
import { MockLLMProvider } from "@/lib/runtime/mock-provider";
import type { LLMResponse } from "@/lib/runtime/llm-provider";

function textResponse(text: string): LLMResponse {
  return {
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    model_served: "mock-model",
    request_id: `req-${text}`,
    usage: { input_tokens: 1, output_tokens: text.length },
  };
}

const BASE_REQUEST = {
  model: "mock-model",
  system: "",
  messages: [],
  tools: [],
  params: { temperature: 0, max_tokens: 1024 },
};

describe("MockLLMProvider", () => {
  it("returns scripted responses in order", async () => {
    const mock = new MockLLMProvider([
      textResponse("first"),
      textResponse("second"),
    ]);
    const r1 = await mock.complete(BASE_REQUEST);
    const r2 = await mock.complete(BASE_REQUEST);
    expect((r1.content[0] as { text: string }).text).toBe("first");
    expect((r2.content[0] as { text: string }).text).toBe("second");
  });

  it("throws when scripted responses are exhausted", async () => {
    const mock = new MockLLMProvider([textResponse("only")]);
    await mock.complete(BASE_REQUEST);
    await expect(mock.complete(BASE_REQUEST)).rejects.toThrow(/exhausted/i);
  });

  it("records each request made", async () => {
    const mock = new MockLLMProvider([textResponse("r")]);
    await mock.complete({ ...BASE_REQUEST, system: "system-1" });
    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0].system).toBe("system-1");
  });
});
