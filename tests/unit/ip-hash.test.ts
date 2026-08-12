import { describe, expect, it } from 'vitest'
import { hashIp } from '@/lib/ip-hash'

describe('hashIp', () => {
  it('produces a 64-character hex digest', () => {
    expect(hashIp('203.0.113.5', 'salt')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable for the same input', () => {
    expect(hashIp('203.0.113.5', 'salt')).toBe(hashIp('203.0.113.5', 'salt'))
  })

  it('differs for different IPs', () => {
    expect(hashIp('203.0.113.5', 'salt')).not.toBe(hashIp('203.0.113.6', 'salt'))
  })

  it('differs for different salts', () => {
    expect(hashIp('203.0.113.5', 'salt-a')).not.toBe(hashIp('203.0.113.5', 'salt-b'))
  })

  it('never contains the raw IP', () => {
    expect(hashIp('203.0.113.5', 'salt')).not.toContain('203.0.113.5')
  })

  it('throws when the salt is empty', () => {
    expect(() => hashIp('203.0.113.5', '')).toThrow('IP_HASH_SALT')
  })
})
