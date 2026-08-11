import { describe, expect, it } from 'vitest'
import { presentLinks } from '@/lib/links'

describe('presentLinks', () => {
  it('returns an empty array for null', () => {
    expect(presentLinks(null)).toEqual([])
  })

  it('returns an empty array for undefined', () => {
    expect(presentLinks(undefined)).toEqual([])
  })

  it('drops entries with a null url', () => {
    expect(presentLinks([{ platform: 'GitHub', url: null }])).toEqual([])
  })

  it('drops entries with a whitespace-only url', () => {
    expect(presentLinks([{ platform: 'LinkedIn', url: '   ' }])).toEqual([])
  })

  it('keeps entries with a real url and trims it', () => {
    expect(presentLinks([{ platform: 'GitHub', url: ' https://github.com/briswells ' }])).toEqual([
      { platform: 'GitHub', url: 'https://github.com/briswells' },
    ])
  })

  it('drops entries with an empty platform label', () => {
    expect(presentLinks([{ platform: '', url: 'https://example.com' }])).toEqual([])
  })
})
