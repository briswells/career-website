import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders an internal path as a Next Link (no target/rel)', () => {
    render(<Button href="/projects">Projects</Button>)
    const link = screen.getByRole('link', { name: 'Projects' })
    expect(link.tagName).toBe('A')
    expect(link).not.toHaveAttribute('target')
    expect(link).not.toHaveAttribute('rel')
  })

  it('treats an https:// URL as external', () => {
    render(<Button href="https://example.com">Visit</Button>)
    const link = screen.getByRole('link', { name: 'Visit' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('treats an uppercase HTTP:// URL as external', () => {
    render(<Button href="HTTP://example.com">Visit</Button>)
    const link = screen.getByRole('link', { name: 'Visit' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('treats a protocol-relative //host URL as external', () => {
    render(<Button href="//example.com/path">Visit</Button>)
    const link = screen.getByRole('link', { name: 'Visit' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('treats a mailto: URL as external', () => {
    render(<Button href="mailto:brian@brianwells.org">Email</Button>)
    const link = screen.getByRole('link', { name: 'Email' })
    expect(link).toHaveAttribute('href', 'mailto:brian@brianwells.org')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('treats a tel: URL as external', () => {
    render(<Button href="tel:+15555550100">Call</Button>)
    const link = screen.getByRole('link', { name: 'Call' })
    expect(link).toHaveAttribute('href', 'tel:+15555550100')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
