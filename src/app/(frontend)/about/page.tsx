import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
import { asMedia } from '@/lib/media'
import { getAbout } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'About',
  description: 'A bit about Brian Wells.',
}

// Without an explicit `dynamic` export, Next prerenders this page once at
// `next build` time and ships that static HTML in the image. Any CMS edit
// made after that point is invisible on the live site until the next
// deploy rebuilds it from scratch — and a redeploy for something unrelated
// (a code fix, a dependency bump) silently REVERTS every edit made in
// between back to whatever the build-time database happened to contain.
// `force-dynamic` renders this page fresh on every request instead, so
// content always reflects the live database and a deploy can never undo
// an admin edit.
export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const about = await getAbout()
  const portrait = asMedia(about.portrait)

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
