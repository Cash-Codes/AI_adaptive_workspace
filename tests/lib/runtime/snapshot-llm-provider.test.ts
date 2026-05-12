import { describe, it, expect } from "vitest";
import { SnapshotLLMProvider } from "@/lib/runtime/snapshot-llm-provider";
import { hashCanonical } from "@/lib/hash";
import type { Event, LLMCallRecord } from "@/lib/events";
import type { LLMRequest, LLMResponse } from "@/lib/runtime/llm-provider";

function makeRequest(system = "s"): LLMRequest {
  return {
    model: "mock-model",
    system,
    messages: [{ role: "user", content: "hi" }],
    tools: [],
    params: { temperature: 0, max_tokens: 1024 },
  };
}

function makeResponse(text: string): LLMResponse {
  return {
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    model_served: "mock-model",
    request_id: `req-${text}`,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
}

function makeLLMCallEvent(request: LLMRequest, response: LLMResponse): LLMCallRecord {
  return {
    type: "llm_call",
    id: `evt-${Math.random()}`,
    timestamp: 1,
    request,
    request_hash: hashCanonical(request),
    response,
  };
}

describe("SnapshotLLMProvider", () => {
  it("returns the recorded response when request_hash matches", async () => {
    const req = makeRequest("system-A");
    const resp = makeResponse("first");
    const events: Event[] = [makeLLMCallEvent(req, resp)];
    const provider = new SnapshotLLMProvider(events);

    const result = await provider.complete(req);
    expect(result).toEqual(resp);
  });

  it("matches by canonical hash regardless of key order in the request", async () => {
    const recordedReq = makeRequest("ordered");
    const resp = makeResponse("ok");
    const events: Event[] = [makeLLMCallEvent(recordedReq, resp)];
    const provider = new SnapshotLLMProvider(events);

    const reorderedReq: LLMRequest = {
      params: { max_tokens: 1024, temperature: 0 },
      tools: [],
      messages: [{ role: "user", content: "hi" }],
      system: "ordered",
      model: "mock-model",
    };
    const result = await provider.complete(reorderedReq);
    expect(result).toEqual(resp);
  });

  it("returns successive responses for distinct requests in the order they were recorded", async () => {
    const reqA = makeRequest("A");
    const reqB = makeRequest("B");
    const respA = makeResponse("a");
    const respB = makeResponse("b");
    const provider = new SnapshotLLMProvider([
      makeLLMCallEvent(reqA, respA),
      makeLLMCallEvent(reqB, respB),
    ]);

    const r1 = await provider.complete(reqA);
    const r2 = await provider.complete(reqB);
    expect(r1).toEqual(respA);
    expect(r2).toEqual(respB);
  });

  it("throws on hash miss with a clear error", async () => {
    const provider = new SnapshotLLMProvider([
      makeLLMCallEvent(makeRequest("recorded"), makeResponse("ok")),
    ]);
    await expect(provider.complete(makeRequest("different"))).rejects.toThrow(/no snapshot/i);
  });

  it("ignores non-LLMCall events when indexing", async () => {
    const req = makeRequest("only");
    const resp = makeResponse("ok");
    const events: Event[] = [
      {
        type: "decision",
        id: "d1",
        timestamp: 1,
        decision: "x",
        label: "X",
        reasoning: "r",
      },
      {
        type: "tool_call",
        id: "t1",
        timestamp: 1,
        tool: "noop",
        arguments: {},
        arguments_hash: "h",
        result: { output: 1 },
      },
      makeLLMCallEvent(req, resp),
    ];
    const provider = new SnapshotLLMProvider(events);
    expect(await provider.complete(req)).toEqual(resp);
  });
});
