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
