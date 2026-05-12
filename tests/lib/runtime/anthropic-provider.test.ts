import { describe, it, expect, vi } from "vitest";
import { AnthropicLLMProvider } from "@/lib/runtime/anthropic-provider";
import type { LLMRequest } from "@/lib/runtime/llm-provider";

function makeRequest(overrides: Partial<LLMRequest> = {}): LLMRequest {
  return {
    model: "claude-sonnet-4-6",
    system: "You are a test agent.",
    messages: [{ role: "user", content: "hello" }],
    tools: [],
    params: { temperature: 0, max_tokens: 1024 },
    ...overrides,
  };
}

describe("AnthropicLLMProvider", () => {
  it("maps LLMRequest to SDK call and SDK response to LLMResponse", async () => {
    const sdkCreate = vi.fn().mockResolvedValue({
      id: "msg_abc",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "Hi there." }],
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      usage: { input_tokens: 12, output_tokens: 4 },
    });
    const fakeClient = { messages: { create: sdkCreate } };

    const provider = new AnthropicLLMProvider({
      // @ts-expect-error — injecting a minimal stub
      client: fakeClient,
    });

    const response = await provider.complete(makeRequest());

    expect(sdkCreate).toHaveBeenCalledTimes(1);
    const sdkArgs = sdkCreate.mock.calls[0][0];
    expect(sdkArgs.model).toBe("claude-sonnet-4-6");
    expect(sdkArgs.max_tokens).toBe(1024);
    expect(sdkArgs.temperature).toBe(0);
    expect(sdkArgs.system).toBe("You are a test agent.");
    expect(sdkArgs.cache_control).toEqual({ type: "ephemeral" });
    expect(sdkArgs.messages).toEqual([{ role: "user", content: "hello" }]);

    expect(response.stop_reason).toBe("end_turn");
    expect(response.model_served).toBe("claude-sonnet-4-6");
    expect(response.request_id).toBe("msg_abc");
    expect(response.usage).toEqual({ input_tokens: 12, output_tokens: 4 });
    expect(response.content).toEqual([{ type: "text", text: "Hi there." }]);
  });

  it("includes tools in the SDK call when present", async () => {
    const sdkCreate = vi.fn().mockResolvedValue({
      id: "msg_def",
      type: "message",
      role: "assistant",
      content: [],
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const fakeClient = { messages: { create: sdkCreate } };
    const provider = new AnthropicLLMProvider({
      // @ts-expect-error — injecting a minimal stub
      client: fakeClient,
    });

    await provider.complete(
      makeRequest({
        tools: [
          {
            name: "get_recent_prs",
            description: "List recent PRs",
            input_schema: { type: "object" },
          },
        ],
      }),
    );

    const sdkArgs = sdkCreate.mock.calls[0][0];
    expect(sdkArgs.tools).toHaveLength(1);
    expect(sdkArgs.tools[0].name).toBe("get_recent_prs");
  });

  it("passes the request hash-relevant fields verbatim to the SDK (no mutation)", async () => {
    const sdkCreate = vi.fn().mockResolvedValue({
      id: "msg_ghi",
      type: "message",
      role: "assistant",
      content: [],
      model: "claude-sonnet-4-6",
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    const fakeClient = { messages: { create: sdkCreate } };
    const provider = new AnthropicLLMProvider({
      // @ts-expect-error -- injecting a minimal stub of the Anthropic SDK
      client: fakeClient,
    });

    const req = makeRequest({
      messages: [
        { role: "user", content: "investigate" },
        { role: "assistant", content: "ok, calling tool" },
        { role: "user", content: "continue" },
      ],
    });
    await provider.complete(req);
    const sdkArgs = sdkCreate.mock.calls[0][0];
    expect(sdkArgs.messages).toEqual(req.messages);
  });
});
