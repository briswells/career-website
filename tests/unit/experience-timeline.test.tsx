import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import type { Experience } from '@/payload-types'

// The generated Experience type has fields this component never reads.
// Casting keeps the fixture focused on what ExperienceTimeline actually consumes.
const withGoodDate = {
  id: 1,
  company: 'PRE Security',
  role: 'Founder',
  startDate: '2024-01-01T00:00:00.000Z',
  current: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Experience

const withBadDate = {
  id: 2,
  company: 'Acme Corp',
  role: 'Staff Engineer',
  startDate: 'not-a-date',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Experience

describe('ExperienceTimeline', () => {
  it('renders dates for a well-formed entry', () => {
    render(<ExperienceTimeline items={[withGoodDate]} />)
    expect(screen.getByText('Jan 2024 – Present')).toBeDefined()
  })

  it('does not throw and still renders role and company when startDate is malformed', () => {
    expect(() => render(<ExperienceTimeline items={[withBadDate]} />)).not.toThrow()
    expect(screen.getByText('Staff Engineer')).toBeDefined()
    expect(screen.getByText('Acme Corp')).toBeDefined()
  })

  it('renders every entry in a mixed list even when one has a malformed date', () => {
    render(<ExperienceTimeline items={[withGoodDate, withBadDate]} />)
    expect(screen.getByText('Founder')).toBeDefined()
    expect(screen.getByText('Staff Engineer')).toBeDefined()
  })
})
