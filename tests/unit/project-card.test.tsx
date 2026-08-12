import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectCard } from '@/components/ProjectCard'
import type { Project } from '@/payload-types'

// The generated Project type has many required fields this component never reads.
// Casting keeps the fixture focused on what ProjectCard actually consumes.
const base = {
  id: 1,
  title: 'Portside Pottery',
  slug: 'portside-pottery',
  summary: 'Production website and booking platform.',
  techStack: [
    { id: 'a', name: 'Next.js' },
    { id: 'b', name: 'Payload' },
  ],
  coverImage: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Project

const withCover = {
  ...base,
  coverImage: {
    id: 2,
    alt: 'Storefront of Portside Pottery',
    url: '/api/media/file/portside-cover.jpg',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
} as unknown as Project

describe('ProjectCard', () => {
  it('links to the project detail page', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByRole('link', { name: /Portside Pottery/ })).toHaveAttribute(
      'href',
      '/projects/portside-pottery',
    )
  })

  it('renders the summary', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByText('Production website and booking platform.')).toBeDefined()
  })

  it('renders each tech stack tag', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByText('Next.js')).toBeDefined()
    expect(screen.getByText('Payload')).toBeDefined()
  })

  it('renders no image element when there is no cover image', () => {
    const { container } = render(<ProjectCard project={base} />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders an image with the cover alt text when a cover image is populated', () => {
    const { container } = render(<ProjectCard project={withCover} />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', 'Storefront of Portside Pottery')
  })
})
