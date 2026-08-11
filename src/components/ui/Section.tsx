import type { ReactNode } from 'react'
import styles from '../layout.module.css'

// Titled sections must be addressable (id required, so aria-labelledby always
// resolves to a rendered heading); untitled sections never render a heading, so
// they need no id for that purpose. This makes a dangling aria-labelledby or a
// silently unnamed region a compile error instead of a runtime a11y bug.
type SectionProps = { children: ReactNode } & (
  | { title: string; id: string }
  | { title?: undefined; id?: string }
)

export function Section({ title, children, id }: SectionProps) {
  // aria-labelledby gives the section an accessible name, so it is exposed as a
  // landmark and reachable via getByRole('region', { name }) in tests.
  const headingId = title && id ? `${id}-heading` : undefined
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
