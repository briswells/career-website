import styles from './layout.module.css'

export type FooterLink = { platform: string; url: string }

export function Footer({
  name,
  email,
  links,
}: {
  name: string
  email?: string | null
  links?: FooterLink[]
}) {
  const year = new Date().getFullYear()
  const hasEmail = Boolean(email && email.trim())
  const visibleLinks = links ?? []

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerInner}>
          <span>
            &copy; {year} {name}
          </span>
          {hasEmail || visibleLinks.length > 0 ? (
            <div className={styles.footerLinks}>
              {hasEmail ? <a href={`mailto:${email}`}>Email</a> : null}
              {visibleLinks.map((link) => (
                <a key={link.url} href={link.url} rel="me noopener" target="_blank">
                  {link.platform}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
