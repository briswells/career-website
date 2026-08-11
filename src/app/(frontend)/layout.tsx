import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import styles from '@/components/layout.module.css'
import './styles.css'

export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#content" className={styles.skipLink}>
          Skip to content
        </a>
        <Header name="Brian Wells" />
        <main id="content">{children}</main>
        <Footer name="Brian Wells" />
      </body>
    </html>
  )
}
