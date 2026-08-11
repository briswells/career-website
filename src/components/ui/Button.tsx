import Link from 'next/link'
import styles from './ui.module.css'

export function Button({
  href,
  children,
  variant = 'solid',
}: {
  href: string
  children: React.ReactNode
  variant?: 'solid' | 'ghost'
}) {
  const className = `${styles.button} ${variant === 'solid' ? styles.solid : styles.ghost}`
  const external = href.startsWith('http')
  if (external) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}
