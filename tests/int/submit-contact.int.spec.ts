import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { hashIp } from '@/lib/ip-hash'
import { RATE_LIMIT_MAX } from '@/lib/rate-limit'

// `submitContact` reads the client IP via `headers()` and, when Resend is
// configured, sends through the `resend` package. Both need to be
// controllable from the test without a real Next.js request scope or a
// network call — mocked below, hoisted so the mock factories can close over
// them.
const { headersStore, sendMock } = vi.hoisted(() => ({
  headersStore: new Map<string, string>(),
  sendMock: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () => ({
    get: (key: string) => headersStore.get(key) ?? null,
  }),
}))

vi.mock('resend', () => ({
  // A real `function`, not an arrow, so `new Resend(...)` in the action under
  // test can invoke it as a constructor.
  Resend: vi.fn().mockImplementation(function MockResend() {
    return { emails: { send: sendMock } }
  }),
}))

// Imported after the mocks above so `submitContact` picks up the mocked
// `next/headers` and `resend` modules instead of the real ones.
const { submitContact } = await import('@/actions/submit-contact')

function formData(overrides: Partial<Record<string, string>> = {}): FormData {
  const data = new FormData()
  data.set('name', overrides.name ?? 'Ada Lovelace')
  data.set('email', overrides.email ?? 'ada@example.com')
  data.set('message', overrides.message ?? 'A message long enough to pass validation.')
  return data
}

async function submissionsFor(ipHash: string) {
  return payload.find({
    collection: 'contact-submissions',
    where: { ipHash: { equals: ipHash } },
  })
}

let payload: Payload
const salt = process.env.IP_HASH_SALT ?? ''

beforeAll(async () => {
  payload = await getPayload({ config })
  if (!salt) throw new Error('IP_HASH_SALT must be set to run this suite')
})

describe('submitContact — persistence', () => {
  const ip = 'test-persist-203.0.113.10'
  const ipHash = hashIp(ip, salt)

  beforeEach(() => {
    headersStore.clear()
    headersStore.set('cf-connecting-ip', ip)
    sendMock.mockReset()
  })

  afterEach(async () => {
    await payload.delete({ collection: 'contact-submissions', where: { ipHash: { equals: ipHash } } })
  })

  it('persists a valid submission and reports success', async () => {
    const result = await submitContact({ status: 'idle' }, formData({ email: 'persisted@example.com' }))

    expect(result.status).toBe('success')

    const { docs } = await submissionsFor(ipHash)
    expect(docs).toHaveLength(1)
    expect(docs[0]?.email).toBe('persisted@example.com')
  })

  it('still persists the submission and reports success when the email send fails', async () => {
    sendMock.mockRejectedValueOnce(new Error('Resend is down'))
    const originalEnv = {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
      CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
    }
    process.env.RESEND_API_KEY = 'test-key'
    process.env.CONTACT_TO_EMAIL = 'owner@example.com'
    process.env.CONTACT_FROM_EMAIL = 'noreply@example.com'

    try {
      const result = await submitContact(
        { status: 'idle' },
        formData({ email: 'send-fails@example.com' }),
      )

      // The row must exist regardless of whether the email send succeeded —
      // that ordering (persist, then attempt to send) is exactly what a
      // future refactor could silently break.
      expect(sendMock).toHaveBeenCalledTimes(1)
      expect(result.status).toBe('success')

      const { docs } = await submissionsFor(ipHash)
      expect(docs).toHaveLength(1)
      expect(docs[0]?.email).toBe('send-fails@example.com')
    } finally {
      process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY
      process.env.CONTACT_TO_EMAIL = originalEnv.CONTACT_TO_EMAIL
      process.env.CONTACT_FROM_EMAIL = originalEnv.CONTACT_FROM_EMAIL
    }
  })
})

describe('submitContact — validation', () => {
  it('routes a turnstileToken validation error to _form so the form can render it', async () => {
    // The form has no input named `turnstileToken` (Turnstile posts its
    // response as `cf-turnstile-response`), so an error keyed to
    // `turnstileToken` would render nowhere in the UI. An explicit empty
    // string (as opposed to the field being absent) fails contactSchema's
    // min(1) check on turnstileToken without tripping the `?? 'dev'` default.
    const data = formData()
    data.set('cf-turnstile-response', '')

    const result = await submitContact({ status: 'idle' }, data)

    expect(result.status).toBe('error')
    expect(result.errors?.turnstileToken).toBeUndefined()
    expect(result.errors?._form).toBe('Verification failed. Please try again.')
  })
})

describe('submitContact — production observability', () => {
  const ip = 'test-prod-observability-203.0.113.30'
  const ipHash = hashIp(ip, salt)

  beforeEach(() => {
    headersStore.clear()
    headersStore.set('cf-connecting-ip', ip)
  })

  afterEach(async () => {
    await payload.delete({ collection: 'contact-submissions', where: { ipHash: { equals: ipHash } } })
  })

  it('warns, but does not fail closed, when TURNSTILE_SECRET_KEY is unset in production', async () => {
    expect(process.env.TURNSTILE_SECRET_KEY).toBeUndefined()
    const originalNodeEnv = process.env.NODE_ENV
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // @ts-expect-error -- NODE_ENV is typed readonly in this project's env types
    process.env.NODE_ENV = 'production'

    try {
      const result = await submitContact(
        { status: 'idle' },
        formData({ email: 'prod-observability@example.com' }),
      )

      expect(result.status).toBe('success')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('TURNSTILE_SECRET_KEY is not set in production'),
      )
    } finally {
      warnSpy.mockRestore()
      // @ts-expect-error -- see above
      process.env.NODE_ENV = originalNodeEnv
    }
  })
})

describe('submitContact — rate limiting', () => {
  const ip = 'test-ratelimit-203.0.113.20'
  const ipHash = hashIp(ip, salt)

  beforeEach(() => {
    headersStore.clear()
    headersStore.set('cf-connecting-ip', ip)
  })

  afterEach(async () => {
    await payload.delete({ collection: 'contact-submissions', where: { ipHash: { equals: ipHash } } })
  })

  it(`allows the first ${RATE_LIMIT_MAX} submissions and rejects the next one from the same IP`, async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      const result = await submitContact(
        { status: 'idle' },
        formData({ email: `rate-limit-${i}@example.com` }),
      )
      expect(result.status).toBe('success')
    }

    const blocked = await submitContact(
      { status: 'idle' },
      formData({ email: 'rate-limit-blocked@example.com' }),
    )

    expect(blocked.status).toBe('error')
    expect(blocked.errors?._form).toBe('Too many messages from this network. Please try again later.')

    const { totalDocs } = await submissionsFor(ipHash)
    expect(totalDocs).toBe(RATE_LIMIT_MAX)
  })
})
