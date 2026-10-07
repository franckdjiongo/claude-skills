# convex-actions-general: examples

## Example: Complete Action with HTTP Endpoint

```ts
// convex/ai.ts
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateResponse = action({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    // Actions can't access ctx.db, but can call mutations
    const context = await ctx.runQuery(internal.functions.loadContext, {
      channelId: args.channelId,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: context,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content in response");

    await ctx.runMutation(internal.functions.writeAgentResponse, {
      channelId: args.channelId,
      content,
    });

    return null;
  },
});
```

## Example: HTTP Endpoint

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    // Process webhook payload
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }),
});

export default http;
```

For more detailed information and additional patterns, refer to the complete reference documentation.
