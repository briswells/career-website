import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'
import { Container } from '@/components/ui/Container'
import { getSiteSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Brian Wells.',
}

// This page reads `process.env.TURNSTILE_SITE_KEY` at render time. Without a
// dynamic API or an explicit `dynamic`/`revalidate` export, Next treats an
// async server component as static and prerenders it once during `next
// build` — which happens inside the Dockerfile, where TURNSTILE_SITE_KEY is
// never supplied (only a throwaway DATABASE_URI is, via a BuildKit secret).
// A build-time prerender would bake in `siteKey: undefined` forever, so the
// shipped HTML would never include the Turnstile script or the
// `.cf-turnstile` widget. At that point every real submission fails
// verification: the client sends no token, submit-contact.ts substitutes the
// 'dev' placeholder, and `verifyTurnstile('dev', <real secret>)` returns
// false — "Verification failed" on every attempt, exactly when Turnstile is
// configured correctly. `force-dynamic` is required to keep this page
// rendered per-request in production. Do not remove it as unused config —
// the page already does a DB read per render (getSiteSettings), so this
// costs nothing extra.
export const dynamic = 'force-dynamic'

export default async function ContactPage() {
  const settings = await getSiteSettings()
  const email = settings.publicEmail?.trim()

  return (
    <Container>
      <div style={{ padding: 'var(--space-12) 0' }}>
        <h1>Contact</h1>
        <p>
          Send a message and it will reach my inbox.
          {email ? (
            <>
              {' '}
              You can also email me directly at <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : null}
        </p>
        <ContactForm siteKey={process.env.TURNSTILE_SITE_KEY} />
      </div>
    </Container>
  )
}
