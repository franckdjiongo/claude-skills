---
description: N independent agents dispatch as one message with N tool calls — never N messages with one call each
paths:
  - .claude/**
  - docs/plans/**
---

# Parallel dispatch

N independent agents → 1 message with N Agent blocks. Not N messages serially.

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
