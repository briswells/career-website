import Image from 'next/image'
import type { Media } from '@/payload-types'
import { Button } from './ui/Button'
import styles from './hero.module.css'

export function Hero({
  headline,
  tagline,
  status,
  portrait,
  resumeUrl,
}: {
  headline: string
  tagline?: string | null
  status?: string | null
  portrait?: Media | null
  resumeUrl?: string | null
}) {
  return (
    <div className={styles.hero}>
      <div className={styles.copy}>
        {status ? (
          <span className={styles.status}>
            <span className={styles.dot} aria-hidden="true" />
            {status}
          </span>
        ) : null}
        <h1>{headline}</h1>
        {tagline ? <p className={styles.lede}>{tagline}</p> : null}
        <div className={styles.actions}>
          <Button href="/projects">See my work</Button>
          {resumeUrl ? (
            <Button href={resumeUrl} variant="ghost">
              Download resume
            </Button>
          ) : null}
        </div>
      </div>
      {portrait?.url ? (
        <Image
          className={styles.portrait}
          src={portrait.url}
          alt={portrait.alt}
          width={400}
          height={400}
          priority
        />
      ) : null}
    </div>
  )
}
