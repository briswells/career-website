import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Portside Pottery')).toBe('portside-pottery')
  })

  it('strips punctuation', () => {
    expect(slugify('AI/ML Model Deployment!')).toBe('ai-ml-model-deployment')
  })

  it('collapses runs of separators', () => {
    expect(slugify('Hadoop  &&  Spark')).toBe('hadoop-spark')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Swift Audiobook Player--  ')).toBe('swift-audiobook-player')
  })

  it('removes diacritics', () => {
    expect(slugify('Café Cluster')).toBe('cafe-cluster')
  })

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('!!!')).toBe('')
  })
})
