import Link from 'next/link'
import styles from './ui.module.css'

// `href.startsWith('http')` would misclassify `mailto:`, `tel:`, and
// protocol-relative `//host` URLs as internal, sending them through Next's
// <Link> (which calls router.push on a nonsense route) instead of a plain
// <a>. Anything with an http(s) scheme, a protocol-relative host, or a
// non-navigational scheme like mailto/tel needs the plain anchor instead.
function isExternalHref(href: string): boolean {
  return /^https?:/i.test(href) || href.startsWith('//') || /^(mailto|tel):/i.test(href)
}

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
  const external = isExternalHref(href)
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
