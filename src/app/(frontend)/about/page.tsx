import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
import { getAbout } from '@/lib/queries'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'About',
  description: 'A bit about Brian Wells.',
}

export default async function AboutPage() {
  const about = await getAbout()
  const portrait =
    about.portrait && typeof about.portrait === 'object' ? (about.portrait as Media) : null

  return (
    <Container>
      <div style={{ padding: 'var(--space-12) 0' }}>
        <h1>About</h1>
        {portrait?.url ? (
          <Image
            src={portrait.url}
            alt={portrait.alt}
            width={400}
            height={400}
            style={{
              width: 200,
              height: 200,
              objectFit: 'cover',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              marginBottom: 'var(--space-6)',
            }}
          />
        ) : null}
        <RichText data={about.body} />
      </div>
    </Container>
  )
}
