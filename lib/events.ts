import { z } from "zod";

export const ContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({
    type: z.literal("tool_use"),
    id: z.string(),
    name: z.string(),
    input: z.unknown(),
  }),
  z.object({
    type: z.literal("tool_result"),
    tool_use_id: z.string(),
    content: z.unknown(),
    is_error: z.boolean().optional(),
  }),
  z.object({ type: z.literal("thinking"), thinking: z.string() }),
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
});
export type Message = z.infer<typeof MessageSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  input_schema: z.unknown(),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

export const LLMCallRecordSchema = z.object({
  type: z.literal("llm_call"),
  id: z.string(),
  timestamp: z.number(),
  request: z.object({
    model: z.string(),
    system: z.string(),
    messages: z.array(MessageSchema),
    tools: z.array(ToolDefinitionSchema),
    params: z.object({
      temperature: z.number(),
      max_tokens: z.number(),
      seed: z.number().optional(),
      stop_sequences: z.array(z.string()).optional(),
      thinking: z.object({ budget_tokens: z.number() }).optional(),
    }),
  }),
  request_hash: z.string(),
  response: z.object({
    content: z.array(ContentBlockSchema),
    stop_reason: z.string(),
    model_served: z.string(),
    request_id: z.string(),
    usage: z.object({
      input_tokens: z.number(),
      output_tokens: z.number(),
    }),
  }),
  diagnostics: z
    .object({
      latency_ms: z.number(),
      cache_hit: z.boolean().optional(),
    })
    .optional(),
});
export type LLMCallRecord = z.infer<typeof LLMCallRecordSchema>;

export const ToolCallRecordSchema = z.object({
  type: z.literal("tool_call"),
  id: z.string(),
  timestamp: z.number(),
  tool: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  arguments_hash: z.string(),
  result: z.object({
    output: z.unknown(),
    error: z.string().optional(),
  }),
});
export type ToolCallRecord = z.infer<typeof ToolCallRecordSchema>;

export const DecisionEventSchema = z.object({
  type: z.literal("decision"),
  id: z.string(),
  timestamp: z.number(),
  decision: z.string(),
  label: z.string(),
  reasoning: z.string(),
  alternatives: z.array(z.string()).optional(),
  context_ref: z.string().optional(),
});
export type DecisionEvent = z.infer<typeof DecisionEventSchema>;

export const RuntimeEventSchema = z.object({
  type: z.literal("runtime"),
  id: z.string(),
  timestamp: z.number(),
  kind: z.enum(["now", "random_uuid", "random_int"]),
  value: z.unknown(),
});
export type RuntimeEvent = z.infer<typeof RuntimeEventSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  LLMCallRecordSchema,
  ToolCallRecordSchema,
  DecisionEventSchema,
  RuntimeEventSchema,
]);
export type Event = z.infer<typeof EventSchema>;
