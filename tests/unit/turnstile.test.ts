import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from '@/lib/turnstile'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string, init: RequestInit) => Response) {
  const spy = vi.fn(async (url: string, init: RequestInit) => impl(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('verifyTurnstile', () => {
  it('returns true when Cloudflare reports success', async () => {
    stubFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(true)
  })

  it('returns false when Cloudflare reports failure', async () => {
    stubFetch(() => new Response(JSON.stringify({ success: false }), { status: 200 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('returns false on a non-200 response', async () => {
    stubFetch(() => new Response('', { status: 500 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('returns false when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('posts the secret, token, and remote IP', async () => {
    const spy = stubFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }))
    await verifyTurnstile('tok', 'secret', '203.0.113.5')
    const body = spy.mock.calls[0][1].body as URLSearchParams
    expect(body.get('secret')).toBe('secret')
    expect(body.get('response')).toBe('tok')
    expect(body.get('remoteip')).toBe('203.0.113.5')
  })
})
