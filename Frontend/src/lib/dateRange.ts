/** Parse mixed orderDate / ISO / Date values to epoch ms. */
export function parseDateMs(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) {
    const t = raw.getTime()
    return Number.isNaN(t) ? null : t
  }
  const s = String(raw).trim()
  if (!s) return null
  const t = Date.parse(s)
  if (!Number.isNaN(t)) return t
  const day = Date.parse(`${s}T00:00:00`)
  return Number.isNaN(day) ? null : day
}

/**
 * Inclusive from/to (`YYYY-MM-DD` inputs). Empty bound is ignored.
 * Rows with no parseable date stay visible so old records are not hidden.
 */
export function inDateRange(raw: unknown, from: string, to: string): boolean {
  if (!from && !to) return true
  const ms = parseDateMs(raw)
  if (ms == null) return true
  if (from) {
    const start = Date.parse(`${from}T00:00:00`)
    if (!Number.isNaN(start) && ms < start) return false
  }
  if (to) {
    const end = Date.parse(`${to}T23:59:59.999`)
    if (!Number.isNaN(end) && ms > end) return false
  }
  return true
}

export function firstDate(...values: unknown[]): unknown {
  for (const v of values) {
    if (parseDateMs(v) != null) return v
  }
  return values[0]
}
