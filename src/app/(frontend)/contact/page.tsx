import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'
import { Container } from '@/components/ui/Container'
import { getSiteSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Brian Wells.',
}

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
