import type { ReactNode } from 'react'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import styles from '@/components/layout.module.css'
import { presentLinks } from '@/lib/links'
import './styles.css'

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
