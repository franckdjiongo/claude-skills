# convex-agents-rate-limiting: code patterns and examples

## Check Message Rate Limit

```typescript
export const sendMessage = mutation({
  args: { threadId: v.string(), message: v.string(), userId: v.string() },
  handler: async (ctx, { threadId, message, userId }) => {
    try {
      await rateLimiter.limit(ctx, "sendMessage", {
        key: userId,
        throws: true,
      });

      await rateLimiter.limit(ctx, "globalSendMessage", { throws: true });

      const { messageId } = await saveMessage(ctx, components.agent, {
        threadId,
        prompt: message,
      });

      return { success: true, messageId };
    } catch (error) {
      if (isRateLimitError(error)) {
        return {
          success: false,
          error: "Rate limit exceeded",
          retryAfter: error.data.retryAfter,
        };
      }
      throw error;
    }
  },
});
```

## Track Actual Usage

```typescript
const myAgent = new Agent(components.agent, {
  name: "My Agent",
  languageModel: openai.chat("gpt-4o-mini"),
  usageHandler: async (ctx, { usage, userId }) => {
    if (!userId) return;

    await rateLimiter.limit(ctx, "tokenUsagePerUser", {
      key: userId,
      count: usage.totalTokens,
      reserve: true,
    });
  },
});
```

## Client-Side Rate Limit Checking

```typescript
import { useRateLimit } from "@convex-dev/rate-limiter/react";
import { isRateLimitError } from "@convex-dev/rate-limiter";

function ChatInput() {
  const { status } = useRateLimit(api.rateLimiting.getRateLimit);

  if (status && !status.ok) {
    return (
      <div className="text-red-500">
        Rate limit exceeded. Retry after{" "}
        {new Date(status.retryAt).toLocaleTimeString()}
      </div>
    );
  }

  return <input type="text" placeholder="Send a message..." />;
}
```
