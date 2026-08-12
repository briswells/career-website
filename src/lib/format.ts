const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonthYear(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(value)}`)
  return MONTH_YEAR.format(date)
}

export function formatDateRange(
  start: string,
  end?: string | null,
  current?: boolean,
): string {
  const startLabel = formatMonthYear(start)
  if (current) return `${startLabel} – Present`
  if (!end) return startLabel
  return `${startLabel} – ${formatMonthYear(end)}`
}

/**
 * Render-safe wrapper around formatDateRange. No collection validates date
 * format at write time, so a malformed value would otherwise crash the page
 * render. A personal site should not white-screen because one date is bad —
 * callers get null back and can render the entry with its date omitted
 * instead. formatMonthYear/formatDateRange keep their throwing contract
 * (it's unit-tested and other callers may rely on it); this wrapper is the
 * opt-in for render call sites that prefer to degrade gracefully.
 */
export function safeFormatDateRange(
  start: string,
  end?: string | null,
  current?: boolean,
): string | null {
  try {
    return formatDateRange(start, end, current)
  } catch {
    return null
  }
}

/**
 * Render-safe wrapper around formatMonthYear, for the same reason as
 * safeFormatDateRange above: no collection validates date format at write
 * time, so a single malformed education date should not white-screen the
 * page. Callers get null back and can omit the date instead of crashing.
 */
export function safeFormatMonthYear(value: string | Date): string | null {
  try {
    return formatMonthYear(value)
  } catch {
    return null
  }
}
