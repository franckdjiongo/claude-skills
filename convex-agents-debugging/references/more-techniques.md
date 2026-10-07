# convex-agents-debugging: code patterns and examples

## Trace Tool Calls

Log all tool invocations:

```typescript
export const myTool = createTool({
  description: "My tool",
  args: z.object({ query: z.string() }),
  handler: async (ctx, { query }): Promise<string> => {
    console.log("[TOOL] myTool called with:", query);
    const result = await someOperation(query);
    console.log("[TOOL] myTool returned:", result);
    return result;
  },
});
```

## Fix Type Errors

Common circular reference issue:

```typescript
// WRONG - no return type
export const myFunction = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    return await someLogic();
  },
});

// CORRECT - explicit return type
export const myFunction = action({
  args: { prompt: v.string() },
  returns: v.string(),
  handler: async (ctx, { prompt }): Promise<string> => {
    return await someLogic();
  },
});
```

## Analyze Message Structure

Debug message ordering:

```typescript
export const analyzeMessages = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const messages = await listMessages(ctx, components.agent, {
      threadId,
      paginationOpts: { cursor: null, numItems: 100 },
    });

    return messages.results.map((msg) => ({
      order: msg.order,
      stepOrder: msg.stepOrder,
      role: msg.message.role,
      status: msg.status,
    }));
  },
});
```
