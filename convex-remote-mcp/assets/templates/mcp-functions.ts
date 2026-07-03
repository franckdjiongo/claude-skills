// convex/mcp/functions.ts
//
// The MCP-facing PROJECTION LAYER. The gateway dispatches the handler's return
// value VERBATIM to the LLM, so every tool that could return a raw Convex doc maps
// ONLY whitelisted fields here — never `return ctx.db.get(...)`. All functions are
// `internal*`: reachable only through the gateway after the allowlist check.
//
// This template shows the reusable patterns. Adapt table/field names to your schema.

import { internalQuery, internalMutation, internalAction } from '../_generated/server'
import { internal } from '../_generated/api'
import { v } from 'convex/values'
import { isOverdue as isOverdueShared } from '../utils/timezone'
// `sanitizeFieldKeys` is defined inline below; in a real project lift it (and any
// other logic shared with the in-app tools) into shared/ and import it from both.

// ---------------------------------------------------------------------------
// Allowlist lookup used by the gateway's `authorize` + initialize gating.
// ---------------------------------------------------------------------------
export const isEmailAllowed = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('<ALLOWLIST_TABLE>') // e.g. 'allowedUsers'
      .withIndex('<ALLOWLIST_INDEX>', (q) => q.eq('email', args.email.toLowerCase()))
      .first()
    if (!user) return { allowed: false as const }
    return { allowed: true as const, role: user.role, name: user.name ?? null }
  },
})

// ---------------------------------------------------------------------------
// Preview truncation — by CODE POINTS, not UTF-16 units. A naive `slice(0,n)` can
// cut an emoji's surrogate pair in half, yielding a lone surrogate that Convex's
// value encoder rejects ("unexpected end of hex escape") — failing the WHOLE list
// response. Use this for every list/search preview.
// ---------------------------------------------------------------------------
function truncatePreview(s: string, max: number): string {
  const cps = Array.from(s)
  return cps.length > max ? cps.slice(0, max).join('') + '…' : s
}

// ---------------------------------------------------------------------------
// Pure DB reshape → internalQuery. Whitelist fields; never leak _id/_creationTime
// /internal job ids. Expose only the PUBLIC business id.
// ---------------------------------------------------------------------------
export const getEvent = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    const e = await ctx.db
      .query('events')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .first()
    if (!e) return null
    return {
      eventId: e.eventId,
      type: e.type,
      date: e.date,
      title: e.title,
      status: e.status,
      details: e.details ?? {},
    } // NO _id / _creationTime / unrelated heavy fields
  },
})

// List vs detail: a list strips the heavy body and returns a preview only.
export const listArchivedMessages = internalQuery({
  args: { type: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100
    const rows = await ctx.db.query('archivedMessages').order('desc').take(limit)
    return rows
      .filter((m) => !args.type || m.type === args.type)
      .map((m) => ({
        messageId: m.messageId,
        type: m.type,
        contentPreview: m.content ? truncatePreview(m.content, 300) : '',
        // full `content` only via a detail tool (getMessageById)
      }))
  },
})

// ---------------------------------------------------------------------------
// Clock-in-action split. isOverdue/currentDate read the wall clock, so they live
// in an ACTION (a query caches its result and FREEZES the date across a long
// session, notably over midnight). Split: a pure-DB *Rows query + an action that
// reads the clock and projects. The action needs an explicit Promise<…> return
// type — actions referencing internal.* are the SECOND circular-inference site.
// ---------------------------------------------------------------------------
export const getCurrentDate = internalAction({
  args: {},
  handler: async (): Promise<{ iso: string; epochMs: number }> => {
    const now = new Date()
    return { iso: now.toISOString(), epochMs: now.getTime() }
  },
})

export const listPendingRemindersRows = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Use the index that matches the description ("sorted by send date"), then sort
    // by `${sendDate}T${sendTime}` (HH:MM sorts lexically) for intra-day order.
    const rows = await ctx.db
      .query('reminderQueue')
      .withIndex('by_status_and_sendDate', (q) => q.eq('status', 'pending'))
      .collect()
    return rows
      .map((r) => ({
        reminderId: r._id, // exposed as a STRING id, not the raw doc
        originalEventId: r.originalEventId,
        sendDate: r.sendDate,
        sendTime: r.sendTime,
        status: r.status,
        messagePreview: truncatePreview(r.message, 100),
      }))
      .sort((a, b) => `${a.sendDate}T${a.sendTime}`.localeCompare(`${b.sendDate}T${b.sendTime}`))
  },
})

export const listPendingReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ currentDate: string; overdueCount: number; reminders: unknown[] }> => {
    const rows = await ctx.runQuery(internal.mcp.functions.listPendingRemindersRows, {})
    const reminders = rows.map((r) => ({
      ...r,
      isOverdue: isOverdueShared(r.status, r.sendDate, r.sendTime), // shared helper → no drift
    }))
    return {
      currentDate: new Date().toISOString(),
      overdueCount: reminders.filter((r) => r.isOverdue).length,
      reminders,
    }
  },
})

// Detail-by-id with a v.id guard against cross-table disclosure. v.id('reminderQueue')
// rejects a FOREIGN-table id, but a malformed SAME-table id can still slip through —
// keep the shape guard.
export const getReminderById = internalAction({
  args: { reminderId: v.id('reminderQueue') },
  handler: async (ctx, args): Promise<unknown | null> => {
    const r = await ctx.runQuery(internal.mcp.functions.getReminderRow, { reminderId: args.reminderId })
    if (!r) return null
    return { ...r, isOverdue: isOverdueShared(r.status, r.sendDate, r.sendTime) }
  },
})
export const getReminderRow = internalQuery({
  args: { reminderId: v.id('reminderQueue') },
  handler: async (ctx, args) => {
    const r = await ctx.db.get(args.reminderId)
    // Shape guard: a same-table doc lacking the expected field is out of scope.
    if (!r || !('originalEventId' in r)) return null
    return {
      reminderId: r._id,
      originalEventId: r.originalEventId,
      sendDate: r.sendDate,
      sendTime: r.sendTime,
      message: r.message, // full body here (detail tool)
      status: r.status,
    }
  },
})

// ---------------------------------------------------------------------------
// JSON-string arg boundary + depth guard. The Convex value codec rejects non-ASCII
// field NAMES at the argument boundary (before the handler), at any depth — so a
// nested accented key can never reach a v.record/v.any arg. Transport such data as
// a JSON STRING, parse it, and recursively sanitize keys to ASCII INSIDE a try.
//
// The sanitizer below is shipped INLINE so this template works as-is. In a real
// project, lift it into a shared helper (e.g. shared/text.ts) and import it from
// BOTH the MCP wrappers and the in-app tools so the two surfaces never drift. The
// MAX_FIELD_DEPTH counter makes pathological nesting a DETERMINISTIC, catchable
// failure (a graceful {ok:false}) instead of an uncaught RangeError escaping the
// dispatch as an opaque "Tool execution failed".
// ---------------------------------------------------------------------------
const MAX_FIELD_DEPTH = 64
class FieldDepthError extends Error {}

function asciiKey(k: string): string {
  const cleaned = k
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics: prénom → prenom
    .replace(/[^A-Za-z0-9]+/g, '_') // any non-ASCII/space run → _
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  return cleaned || '_'
}

function sanitizeFieldKeys(input: unknown, depth = 0): unknown {
  if (depth > MAX_FIELD_DEPTH) throw new FieldDepthError('details nested too deeply')
  if (Array.isArray(input)) return input.map((x) => sanitizeFieldKeys(x, depth + 1))
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(input)) out[asciiKey(k)] = sanitizeFieldKeys(val, depth + 1)
    return out
  }
  return input // primitives (and their accented VALUES) pass through unchanged
}

type ParsedDetails =
  | { ok: true; value: Record<string, unknown> | undefined }
  | { ok: false; error: string }

function parseDetails(raw: string | undefined): ParsedDetails {
  if (raw === undefined || raw.trim() === '') return { ok: true, value: undefined }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: '`details` must be a valid JSON string.' }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '`details` must be a JSON object (key/value pairs).' }
  }
  // Keep sanitization INSIDE the try so a FieldDepthError becomes a graceful
  // rejection rather than an opaque dispatch failure.
  try {
    return { ok: true, value: sanitizeFieldKeys(parsed) as Record<string, unknown> }
  } catch {
    return { ok: false, error: '`details` is too deeply nested (invalid JSON object).' }
  }
}

export const createEvent = internalMutation({
  args: {
    type: v.string(),
    title: v.string(),
    date: v.string(),
    details: v.optional(v.string()), // JSON string, not v.record/v.any
  },
  handler: async (ctx, args) => {
    const parsed = parseDetails(args.details)
    if (!parsed.ok) return { success: false, message: parsed.error }
    const safeDetails = parsed.value ?? {}
    // ...insert here. On UPDATE, merge SHALLOW: { ...(doc.details ?? {}), ...safeDetails }
    // (patch() replaces the whole object — document this in the tool description so
    //  the model returns the COMPLETE nested object/array when changing one key).
    // Return the PUBLIC business id only — never the raw Convex _id.
    return { success: true, eventId: '<the public id you generated/inserted>' }
  },
})

// Free-text search — the projection still applies, and the gateway redacts the
// query term from the audit (readRedacting('query') in the catalog).
export const searchArchive = internalAction({
  args: { query: v.optional(v.string()), type: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<unknown[]> => {
    const rows = await ctx.runQuery(internal.mcp.functions.listArchivedMessages, {
      type: args.type,
      limit: args.limit,
    })
    const q = args.query?.toLowerCase()
    return q ? rows.filter((r) => r.contentPreview.toLowerCase().includes(q)) : rows
  },
})
