# convex-functions: code patterns and examples

### Queries

Queries are reactive, cached, and read-only:

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUser = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get("users", args.userId);
  },
});

// Query with index
export const listUserTasks = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      title: v.string(),
      completed: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
```

### Mutations

Mutations modify the database and are transactional:

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const createTask = mutation({
  args: {
    title: v.string(),
    userId: v.id("users"),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    // Validate user exists
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new ConvexError("User not found");
    }

    return await ctx.db.insert("tasks", {
      title: args.title,
      userId: args.userId,
      completed: false,
      createdAt: Date.now(),
    });
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("tasks", args.taskId);
    return null;
  },
});
```

### Actions

Actions can call external APIs but have no direct database access:

```typescript
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Call external API
    const response = await fetch("https://api.email.com/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    return { success: response.ok };
  },
});

// Action calling queries and mutations
export const processOrder = action({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Read data via query
    const order = await ctx.runQuery(api.orders.get, { orderId: args.orderId });

    if (!order) {
      throw new Error("Order not found");
    }

    // Call external payment API
    const paymentResult = await processPayment(order);

    // Update database via mutation
    await ctx.runMutation(internal.orders.updateStatus, {
      orderId: args.orderId,
      status: paymentResult.success ? "paid" : "failed",
    });

    return null;
  },
});
```

### HTTP Actions

HTTP actions handle webhooks and external requests:

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Webhook endpoint
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    const body = await request.text();

    // Verify webhook signature
    if (!verifyStripeSignature(body, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);

    // Process webhook
    await ctx.runMutation(internal.payments.handleWebhook, {
      eventType: event.type,
      data: event.data,
    });

    return new Response("OK", { status: 200 });
  }),
});

// API endpoint
http.route({
  path: "/api/users/:userId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const userId = url.pathname.split("/").pop();

    const user = await ctx.runQuery(api.users.get, {
      userId: userId as Id<"users">,
    });

    if (!user) {
      return new Response("Not found", { status: 404 });
    }

    return Response.json(user);
  }),
});

export default http;
```

### Internal Functions

Use internal functions for sensitive operations:

```typescript
import {
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";

// Only callable from other Convex functions
export const _updateUserCredits = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;

    await ctx.db.patch("users", args.userId, {
      credits: (user.credits || 0) + args.amount,
    });
    return null;
  },
});

// Call internal function from action
export const purchaseCredits = action({
  args: { userId: v.id("users"), amount: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Process payment externally
    await processPayment(args.amount);

    // Update credits via internal mutation
    await ctx.runMutation(internal.users._updateUserCredits, {
      userId: args.userId,
      amount: args.amount,
    });

    return null;
  },
});
```

### Scheduling Functions

Schedule functions to run later:

```typescript
import { mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const scheduleReminder = mutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
    delayMs: v.number(),
  },
  returns: v.id("_scheduled_functions"),
  handler: async (ctx, args) => {
    return await ctx.scheduler.runAfter(
      args.delayMs,
      internal.notifications.sendReminder,
      { userId: args.userId, message: args.message },
    );
  },
});

export const sendReminder = internalMutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      message: args.message,
      sentAt: Date.now(),
    });
    return null;
  },
});
```

## Examples

### Complete Function File

```typescript
// convex/messages.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const messageValidator = v.object({
  _id: v.id("messages"),
  _creationTime: v.number(),
  channelId: v.id("channels"),
  authorId: v.id("users"),
  content: v.string(),
  editedAt: v.optional(v.number()),
});

// Public query
export const list = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    return await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(limit);
  },
});

// Public mutation
export const send = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    if (args.content.trim().length === 0) {
      throw new ConvexError("Message cannot be empty");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      content: args.content.trim(),
    });

    // Schedule notification
    await ctx.scheduler.runAfter(0, internal.messages.notifySubscribers, {
      channelId: args.channelId,
      messageId,
    });

    return messageId;
  },
});

// Internal mutation
export const notifySubscribers = internalMutation({
  args: {
    channelId: v.id("channels"),
    messageId: v.id("messages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get channel subscribers and notify them
    const subscribers = await ctx.db
      .query("subscriptions")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();

    for (const sub of subscribers) {
      await ctx.db.insert("notifications", {
        userId: sub.userId,
        messageId: args.messageId,
        read: false,
      });
    }
    return null;
  },
});
```
