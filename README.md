# Adaptive Workspace

A replay debugger for LLM agent runs that makes non deterministic workflows inspectable, forkable and testable.

Instead of treating LLM calls as opaque side effects, Adaptive Workspace captures them as replayable primitives.

Given the same inputs, a run replays identically. Edit a tool result or decision and the system forks from that point and shows exactly where and why the new run diverges.

## The problem

Most agent runtimes treat LLM driven workflows as black boxes - once a run completes, you can inspect logs, but you cannot reexecute, fork or systematically test alternative paths.

When the agent picks the wrong path, there is no clean way to ask,
- Would I get the same answer if I ran this again?
- What if the tool had returned a different result here?
- What if the agent had decided differently at this point?
- Where exactly do two runs diverge and why?

Example:
An agent investigates a GitHub regression and concludes "PR #142 caused the issue."  
With Adaptive Workspace, you can replay the run identically, then edit a tool result (e.g. remove the database change signal), fork the run and see the agent choose a different path at the exact point of divergence.

Tracing tools (LangSmith, Helicone) record what happened but cannot reexecute or fork. Workflow engines (Temporal, Trigger.dev) replay deterministic code from checkpoints but treat LLM calls as opaque side effects. Adaptive Workspace bridges this gap by treating LLM calls as replayable primitives.

## What's different

Three event types, each first class:
- **LLMCall** - the unit of deterministic replay. Full request and response captured, hashed for equality checks.
- **ToolCall** - the unit of forking. Edit a recorded tool output and replay from that point.
- **Decision** - the unit of narrative. The agent emits structured decisions; the UI renders the workflow against them.

Two replay modes:

- **Snapshot replay** - replays recorded outputs without calling the LLM. Instant, deterministic, zero API cost. Default mode.
- **Verify replay** - reexecutes against the live LLM and surfaces drift when outputs differ from the recorded run.

## Status

dev in progress!

## Honest determinism caveat

Even at temperature 0, LLM providers do not guarantee bit identical outputs across time and hardware (batch composition, GPU floating point non determinism, silent variant routing). The honest claim:

> Deterministic replay given same model snapshot. Drift from model updates is detected and surfaced rather than hidden.

This framing makes drift a first class, debuggable event rather than something silently breaking your system.