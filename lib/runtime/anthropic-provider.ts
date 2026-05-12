import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMRequest, LLMResponse } from "@/lib/runtime/llm-provider";
import type { ContentBlock } from "@/lib/events";

export type AnthropicLLMProviderConfig = {
  client?: Anthropic;
  apiKey?: string;
};

export class AnthropicLLMProvider implements LLMProvider {
  private readonly client: Anthropic;

  constructor(config: AnthropicLLMProviderConfig = {}) {
    this.client = config.client ?? new Anthropic(config.apiKey ? { apiKey: config.apiKey } : {});
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const sdkResponse = await this.client.messages.create({
      model: request.model,
      max_tokens: request.params.max_tokens,
      temperature: request.params.temperature,
      system: request.system,
      tools: request.tools as unknown as Anthropic.Messages.Tool[],
      messages: request.messages as unknown as Anthropic.MessageParam[],
      cache_control: { type: "ephemeral" },
    } as Anthropic.Messages.MessageCreateParamsNonStreaming);

    return {
      content: sdkResponse.content as unknown as ContentBlock[],
      stop_reason: sdkResponse.stop_reason ?? "end_turn",
      model_served: sdkResponse.model,
      request_id: sdkResponse.id,
      usage: {
        input_tokens: sdkResponse.usage.input_tokens,
        output_tokens: sdkResponse.usage.output_tokens,
      },
    };
  }
}
