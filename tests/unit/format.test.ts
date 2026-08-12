import { describe, expect, it } from 'vitest'
import { formatDateRange, formatMonthYear, safeFormatDateRange } from '@/lib/format'

describe('formatMonthYear', () => {
  it('formats an ISO date as abbreviated month and year in UTC', () => {
    expect(formatMonthYear('2025-08-01T00:00:00.000Z')).toBe('Aug 2025')
  })

  it('does not shift across a month boundary due to local timezone', () => {
    expect(formatMonthYear('2024-01-01T00:00:00.000Z')).toBe('Jan 2024')
  })
})

describe('formatDateRange', () => {
  it('renders Present for a current role', () => {
    expect(formatDateRange('2025-08-01T00:00:00.000Z', null, true)).toBe('Aug 2025 – Present')
  })

  it('renders a closed range', () => {
    expect(
      formatDateRange('2024-01-01T00:00:00.000Z', '2025-08-01T00:00:00.000Z', false),
    ).toBe('Jan 2024 – Aug 2025')
  })

  it('renders only the start when there is no end and it is not current', () => {
    expect(formatDateRange('2021-05-01T00:00:00.000Z', null, false)).toBe('May 2021')
  })

  it('ignores endDate when current is true', () => {
    expect(
      formatDateRange('2025-08-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', true),
    ).toBe('Aug 2025 – Present')
  })
})

describe('safeFormatDateRange', () => {
  it('returns null instead of throwing when startDate is unparseable', () => {
    expect(safeFormatDateRange('not-a-date')).toBeNull()
  })

  it('returns null instead of throwing when endDate is unparseable', () => {
    expect(safeFormatDateRange('2024-01-01T00:00:00.000Z', 'not-a-date', false)).toBeNull()
  })

  it('formats a current role the same as formatDateRange', () => {
    expect(safeFormatDateRange('2025-08-01T00:00:00.000Z', null, true)).toBe('Aug 2025 – Present')
  })

  it('formats a closed range the same as formatDateRange', () => {
    expect(
      safeFormatDateRange('2024-01-01T00:00:00.000Z', '2025-08-01T00:00:00.000Z', false),
    ).toBe('Jan 2024 – Aug 2025')
  })
})
