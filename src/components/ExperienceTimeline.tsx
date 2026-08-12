import type { Experience } from '@/payload-types'
import { safeFormatDateRange } from '@/lib/format'
import styles from './timeline.module.css'

export function ExperienceTimeline({
  items,
  detailed = false,
}: {
  items: Experience[]
  detailed?: boolean
}) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <div className={styles.dates}>
            {safeFormatDateRange(item.startDate, item.endDate, Boolean(item.current))}
          </div>
          <div className={styles.detail}>
            <h3 className={styles.role}>{item.role}</h3>
            <div className={styles.company}>
              {item.company}
              {item.location ? ` · ${item.location}` : ''}
            </div>
            {detailed && item.bullets?.length ? (
              <ul className={styles.bullets}>
                {item.bullets.map((bullet) => (
                  <li key={bullet.id ?? bullet.text}>{bullet.text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
