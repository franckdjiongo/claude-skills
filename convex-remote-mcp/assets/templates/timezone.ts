// convex/utils/timezone.ts
//
// SHARED clock/date helper for any tool that computes overdue/current-date.
// Used by BOTH the MCP projection wrappers and the in-app tools so the two
// surfaces never drift. Drop this file if your MCP exposes no date logic.
//
// Replace <TIMEZONE> with your IANA zone (e.g. 'America/Montreal'). Two
// hard-won correctness guards are baked in: the ICU "24" midnight quirk and the
// Date.UTC silent-overflow round-trip check — keep both.

const DEFAULT_TIMEZONE = '<TIMEZONE>'

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const lookup: Record<string, string> = {}
  for (const part of parts) lookup[part.type] = part.value

  // `Intl.DateTimeFormat('en-CA', hour12:false)` can format local midnight as
  // hour "24" (an ICU quirk) instead of "00". `Date.UTC(..., 24, ...)` would
  // roll over to the next day, skewing the offset by ~24h — marking 00:00–00:59
  // reminders overdue almost a day early. Normalize 24 → 0; the reported
  // calendar day at that instant is already correct.
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour) % 24,
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  }
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = getDatePartsInTimeZone(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return (asUtc - date.getTime()) / 60000
}

export function toUtcDateFromTimeZone(
  dateStr: string,
  timeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): Date | null {
  if (!dateStr || !timeStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  // Reject out-of-range components. `Date.UTC` SILENTLY normalizes overflow
  // (e.g. "2026-13-40 18:00" → a real 2027-02-09 instant, "18:99" → next hour),
  // so a malformed sendDate/sendTime would otherwise yield a non-null future
  // Date — the scheduler would queue a job for the WRONG day while callers
  // report `scheduled: true`. A round-trip check catches every such overflow.
  if (
    utcGuess.getUTCFullYear() !== year ||
    utcGuess.getUTCMonth() !== month - 1 ||
    utcGuess.getUTCDate() !== day ||
    utcGuess.getUTCHours() !== hour ||
    utcGuess.getUTCMinutes() !== minute
  ) {
    return null
  }
  const offset = getTimeZoneOffsetMinutes(utcGuess, timeZone)
  let utcDate = new Date(utcGuess.getTime() - offset * 60000)
  const offsetAfter = getTimeZoneOffsetMinutes(utcDate, timeZone)
  if (offsetAfter !== offset) utcDate = new Date(utcGuess.getTime() - offsetAfter * 60000)
  return utcDate
}

// A pending item is overdue once its scheduled instant has passed. The instant
// MUST go through the same zone→UTC conversion the scheduler uses: parsing
// `${date}T${time}:00` as a naive Date interprets it in the runtime zone (UTC on
// Convex), marking an 18:00 local item overdue ~4-5h early.
export function isOverdue(status: string, sendDate: string, sendTime: string): boolean {
  if (status !== 'pending') return false
  const due = toUtcDateFromTimeZone(sendDate, sendTime)
  return !!due && due.getTime() < Date.now()
}
