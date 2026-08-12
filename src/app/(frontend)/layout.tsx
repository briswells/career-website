import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import styles from '@/components/layout.module.css'
import { presentLinks } from '@/lib/links'
import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  const name = settings.name || 'Brian Wells'
  const title = settings.defaultSeo?.title || name
  const description =
    settings.defaultSeo?.description || settings.tagline || 'Software and infrastructure engineer.'

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'),
    title: { default: title, template: `%s · ${name}` },
    description,
    openGraph: { title, description, type: 'website', siteName: name },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const name = settings.name || 'Brian Wells'

  return (
    <html lang="en">
      <body>
        <a href="#content" className={styles.skipLink}>
          Skip to content
        </a>
        <Header name={name} />
        <main id="content">{children}</main>
        <Footer
          name={name}
          email={settings.publicEmail}
          links={presentLinks(settings.socialLinks)}
        />
      </body>
    </html>
  )
}
