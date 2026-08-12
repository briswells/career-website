import type { MetadataRoute } from 'next'

// This file must stay at `src/app/robots.ts`, NOT under `src/app/(frontend)/`
// with the rest of the public pages. Do not "clean this up" by moving it —
// doing so silently reintroduces a 404 on /robots.txt.
//
// Next 16.2.6's route-metadata resolver (`normalizeMetadataRoute`) appends
// `.txt` to the generated route only when the file's page path is *exactly*
// `/robots` — a strict `===` check. But `getPageFromPath` does not strip
// route-group segments (the `(frontend)` folder) when computing that page
// path, so a `robots.ts` nested inside `(frontend)` resolves to something
// like `/robots-<hash>` instead of `/robots`, the equality check fails, no
// `.txt` suffix is appended, and `/robots.txt` 404s at runtime.
// `sitemap.ts` doesn't have this problem because Next's sitemap handling
// checks with `endsWith('/sitemap')` instead of strict equality, which
// tolerates the extra route-group segment — so it can safely live under
// `(frontend)` while this file cannot. This is Next-version-specific
// behavior, not a stylistic choice; re-verify before "fixing" it on upgrade.

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
