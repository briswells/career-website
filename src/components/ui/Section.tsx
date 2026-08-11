import type { ReactNode } from 'react'
import styles from '../layout.module.css'

export function Section({
  title,
  children,
  id,
}: {
  title?: string
  children: ReactNode
  id?: string
}) {
  // aria-labelledby gives the section an accessible name, so it is exposed as a
  // landmark and reachable via getByRole('region', { name }) in tests.
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section className={styles.section} id={id} aria-labelledby={headingId}>
      {title ? (
        <h2 className={styles.sectionTitle} id={headingId}>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  )
}
