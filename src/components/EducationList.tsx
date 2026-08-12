import type { Education } from '@/payload-types'
import { safeFormatMonthYear } from '@/lib/format'

export function EducationList({ items }: { items: Education[] }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((item) => {
        const date = safeFormatMonthYear(item.date)
        return (
          <li key={item.id} style={{ marginBottom: 'var(--space-4)' }}>
            <strong>{item.degree}</strong>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
              {item.school}
              {date ? ` · ${date}` : ''}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
