---
description: N independent agents dispatch as one message with N tool calls — never N messages with one call each
paths:
  - .claude/**
  - docs/plans/**
---

# Parallel dispatch

N independent agents → 1 message with N Agent blocks. Not N messages serially.

## First: should you delegate at all?

Batching *how* and deciding *whether* are different questions. Current models delegate readily, and small delegations cost more than they return.

- Delegate large tracks that are genuinely independent and parallelizable — a wide multi-file investigation, an audit across disjoint areas. Measured payoff: a 10-agent team reaches +3.1pp with a 5.6–5.9× latency speedup on wide search; a 5-agent team, 2.2× latency at equal score. Small or non-parallelizable work doesn't clear that bar.
- Work you can finish in a handful of tool calls stays inline. One subagent when one suffices.
- No subagent to check your own output — you already do that. A reviewer reading someone else's diff against the spec is a different job and it stays.

## Applies when at least 2 conditions hold

- Brief says "parallel" or "single message".
- Agents are read-only (audit, review, reality-check, persona-simulator).
- Agents touch disjoint file sets.
- Returns are independent.

If the prompt for agent N+1 depends on the return of agent N → serial is justified.

## Hard rule

If you intend to call multiple tools and there are no dependencies between them, make all of the independent calls in the same block. Sequential calls only when one truly waits on another's output.

## Exceptions

- Previous agent failed (`MISSING_INPUT`, timeout, fatal error).
- User confirmation between phases.
- User explicitly requested serial.

## Anti-patterns

- "Dispatch the first to see the return format" → read `.claude/agents/<name>.md` once instead.
- "I want findings from the first before the second" → they weren't actually parallel; decide upfront.
- "Serial is more cautious" → caution comes from prompts, not from latency.

## Example — parallel correct

```
[single message]
  Agent: reviewer (foreground)
  Agent: persona-simulator (foreground)
  Agent: reality-check (foreground)
[returns: 3 independent reports]
```

## Example — serial correct

Implementer changes files, then reviewer reads the diff. The reviewer's input is the implementer's output, so serial is the only viable shape.
