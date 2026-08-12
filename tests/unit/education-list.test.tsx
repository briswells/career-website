import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EducationList } from '@/components/EducationList'
import type { Education } from '@/payload-types'

// The generated Education type has fields this component never reads.
// Casting keeps the fixture focused on what EducationList actually consumes.
const withGoodDate = {
  id: 1,
  school: 'California State University, Chico',
  degree: 'Master of Science in Computer Science',
  date: '2024-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Education

const withBadDate = {
  id: 2,
  school: 'Acme University',
  degree: 'Bachelor of Science in Underwater Basket Weaving',
  date: 'not-a-date',
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Education

describe('EducationList', () => {
  it('renders the date for a well-formed entry', () => {
    render(<EducationList items={[withGoodDate]} />)
    expect(screen.getByText('California State University, Chico · Jan 2024')).toBeDefined()
  })

  it('does not throw and still renders school and degree when date is malformed', () => {
    expect(() => render(<EducationList items={[withBadDate]} />)).not.toThrow()
    expect(
      screen.getByText('Bachelor of Science in Underwater Basket Weaving'),
    ).toBeDefined()
    expect(screen.getByText('Acme University')).toBeDefined()
  })

  it('renders every entry in a mixed list even when one has a malformed date', () => {
    render(<EducationList items={[withGoodDate, withBadDate]} />)
    expect(screen.getByText('Master of Science in Computer Science')).toBeDefined()
    expect(
      screen.getByText('Bachelor of Science in Underwater Basket Weaving'),
    ).toBeDefined()
  })
})
