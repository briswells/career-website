import { describe, expect, it } from 'vitest'
import { contactSchema, fieldErrors } from '@/lib/contact-schema'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I would like to talk about a role on our infrastructure team.',
  turnstileToken: 'token-abc',
}

describe('contactSchema', () => {
  it('accepts a well-formed submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('trims surrounding whitespace from the name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '  Ada  ' })
    expect(result.success && result.data.name).toBe('Ada')
  })

  it('rejects an empty name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed email', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects a message under 10 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'hi' })
    expect(result.success).toBe(false)
  })

  it('rejects a message over 5000 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('rejects a missing turnstile token', () => {
    const result = contactSchema.safeParse({ ...valid, turnstileToken: '' })
    expect(result.success).toBe(false)
  })
})

describe('fieldErrors', () => {
  it('maps the first issue per field to a message', () => {
    const result = contactSchema.safeParse({ ...valid, name: '', email: 'nope' })
    expect(result.success).toBe(false)
    if (result.success) return
    const errors = fieldErrors(result.error)
    expect(errors.name).toBe('Name is required')
    expect(errors.email).toBe('Enter a valid email address')
  })
})
