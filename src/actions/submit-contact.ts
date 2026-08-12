'use server'

import { headers } from 'next/headers'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Resend } from 'resend'
import { contactSchema, fieldErrors } from '@/lib/contact-schema'
import { hashIp } from '@/lib/ip-hash'
import { isRateLimited } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export type ContactState = {
  status: 'idle' | 'success' | 'error'
  errors?: Record<string, string>
}

// The site is only reachable through a Cloudflare Tunnel (cloudflared makes an
// outbound-only connection; there is no publicly routable origin to hit
// directly). Cloudflare's edge always overwrites `cf-connecting-ip` with the
// real connecting IP on every proxied request, so a client cannot spoof it —
// it is safe to trust as-is.
//
// `x-forwarded-for` is deliberately NOT used as a fallback. Cloudflare
// *appends* the true client IP to any existing X-Forwarded-For value rather
// than replacing it, so a client that sends its own XFF header controls the
// first (leftmost) entry. Reading `x-forwarded-for.split(',')[0]` would hand
// an attacker a free, per-request rotating identity — defeating
// `isRateLimited` entirely for zero benefit, since `cf-connecting-ip` is
// always present on traffic that actually came through the tunnel.
//
// When neither header is present (e.g. hitting the origin directly in local
// dev/tests), every such request collapses into a single 'unknown' bucket.
// That is an intentional, conservative failure mode for a personal site: it
// caps anonymous/unidentifiable traffic to the same shared budget as one
// visitor rather than exempting it from rate limiting altogether.
async function clientIp(): Promise<string> {
  const h = await headers()
  return h.get('cf-connecting-ip') ?? 'unknown'
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Validate first: pure, synchronous, and cheap. This must reject malformed
  // or oversized input before any database read, network call, or write.
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    // When Turnstile is not configured (local dev), accept a placeholder token.
    turnstileToken: formData.get('cf-turnstile-response') ?? 'dev',
  })

  if (!parsed.success) {
    // `turnstileToken` has no field in the form, so an error keyed to it would
    // render nowhere and the user would see the form silently do nothing.
    // Route it to `_form`, the one error slot every render path checks.
    const errors = fieldErrors(parsed.error)
    if (errors.turnstileToken) {
      errors._form = errors.turnstileToken
      delete errors.turnstileToken
    }
    return { status: 'error', errors }
  }

  const ip = await clientIp()
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (secret) {
    const human = await verifyTurnstile(parsed.data.turnstileToken, secret, ip)
    if (!human) {
      return { status: 'error', errors: { _form: 'Verification failed. Please try again.' } }
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Unset in local dev is expected and stays silent. Unset in production
    // means the form is live with no bot protection — that must be visible
    // in the container logs, not just implied by an absent widget. This does
    // not fail closed: a config slip should degrade to "no CAPTCHA," not
    // "contact form is down."
    console.warn(
      'TURNSTILE_SECRET_KEY is not set in production; accepting contact submissions with no bot verification.',
    )
  }

  const payload = await getPayload({ config })
  const salt = process.env.IP_HASH_SALT
  if (!salt) {
    payload.logger.error('IP_HASH_SALT is not set; refusing to accept submissions.')
    return { status: 'error', errors: { _form: 'Something went wrong. Please email instead.' } }
  }
  const ipHash = hashIp(ip, salt)

  // check-then-create: a small number of concurrent submissions from the same
  // IP can all pass this count before any of their rows commit, permitting a
  // brief burst above RATE_LIMIT_MAX. Accepted deliberately — at contact-form
  // scale on a personal site this is a minor nuisance, not a breach, and a
  // distributed lock/transaction to close it isn't worth the complexity here.
  if (await isRateLimited(payload, ipHash)) {
    return {
      status: 'error',
      errors: { _form: 'Too many messages from this network. Please try again later.' },
    }
  }

  // Persist before sending email so a Resend outage never loses a message.
  await payload.create({
    collection: 'contact-submissions',
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      ipHash,
      submittedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL

  if (apiKey && to && from) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from,
        to,
        replyTo: parsed.data.email,
        subject: `brianwells.org — message from ${parsed.data.name}`,
        text: `${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      })
    } catch (error) {
      // The submission is already durable; a delivery failure must not fail the request.
      payload.logger.error({ err: error }, 'Resend delivery failed')
    }
  }

  return { status: 'success' }
}
