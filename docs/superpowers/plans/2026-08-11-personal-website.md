# brianwells.org Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and ship a personal portfolio site at brianwells.org — a Next.js app with Payload CMS embedded, running as a Docker container on unraid behind a Cloudflare Tunnel.

**Architecture:** Payload 3 mounts inside a single Next.js App Router app, so the CMS admin, the REST API, and the public site are one codebase and one container. Content lives in Postgres; uploaded images live in Cloudflare R2 and are served from a public R2 custom domain rather than proxied through Node. Public pages are statically rendered and revalidated on demand by Payload `afterChange`/`afterDelete` hooks.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, Payload 3.87.1, Postgres (`@payloadcms/db-postgres`), Cloudflare R2 (`@payloadcms/storage-s3`), Lexical rich text, Zod 4, Resend, Cloudflare Turnstile, Vitest 4, Playwright 1.58, TypeScript 5.7 strict.

**Spec:** `docs/superpowers/specs/2026-08-11-personal-website-design.md`

## Global Constraints

These apply to every task. Every task's requirements implicitly include this section.

- **Payload packages are pinned to exactly `3.87.1`** — `payload`, `@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/storage-s3`. Mixed Payload versions fail at runtime.
- **Next.js is pinned to `16.2.6`, React and React DOM to `19.2.6`.** This is the exact combination the Payload 3.87.1 blank template is tested against. Next 16.3.0 is within Payload's peer range (`>=16.2.6 <17.0.0`) but is not the tested pin; do not upgrade during initial build.
- **Package manager is npm.** The upstream template assumes pnpm; every script and Dockerfile path must be converted.
- **Node 24 in the container** (`node:24-alpine`). Local development requires Node >= 20.9.
- **TypeScript `strict: true`.** No `any`, no `@ts-ignore`. If types fight you, fix the type.
- **Accent colors are exactly `#0f766e` (light) and `#2dd4bf` (dark).** Surfaces are warm-neutral, never blue-grey.
- **Components must never contain literal color values.** All color comes from CSS custom properties defined in `src/styles/tokens.css`. The sole exception is `opengraph-image.tsx` (Task 15), which renders in an isolated Satori context that cannot read custom properties.
- **Every accent-on-surface pairing must pass WCAG AA (4.5:1 for body text, 3:1 for large text and UI borders) in both themes.** Task 2 adds a test that enforces this.
- **Every contact detail and social link must conditionally render.** Unset values produce no DOM output — never an empty `mailto:` or a placeholder string. Contact fields are deliberately empty at launch.
- **Every image requires alt text.** The `media` collection enforces this at the schema level.
- **Secrets never enter the repo.** Only `.env.example` with empty values is committed.
- **Commit after every task.** Use conventional commit prefixes (`feat:`, `test:`, `chore:`, `docs:`).
- **Git identity is already configured locally** as `briswells` / `briswells@gmail.com`. Do not change it and do not add `--global` flags to any git command.

## File Structure

```
src/
├── app/
│   ├── (frontend)/
│   │   ├── layout.tsx              # Root layout: fonts, tokens, Header, Footer
│   │   ├── page.tsx                # Home
│   │   ├── projects/page.tsx       # Projects index
│   │   ├── projects/[slug]/page.tsx
│   │   ├── experience/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── (payload)/                  # Untouched, from template
│   └── api/health/route.ts         # Container healthcheck
├── collections/
│   ├── Users.ts  Media.ts  Projects.ts  Experience.ts  Education.ts
│   └── ContactSubmissions.ts
├── globals/
│   └── SiteSettings.ts  About.ts  Skills.ts
├── components/
│   ├── ui/                         # Container, Section, Button, Tag, Card
│   ├── Header.tsx  Footer.tsx  Hero.tsx
│   ├── ProjectCard.tsx  ProjectGrid.tsx
│   ├── ExperienceTimeline.tsx  SkillGroups.tsx
│   ├── RichText.tsx  ContactForm.tsx
├── lib/
│   ├── slug.ts  format.ts  links.ts
│   ├── contact-schema.ts  ip-hash.ts  rate-limit.ts  turnstile.ts
│   └── revalidate.ts
├── actions/submit-contact.ts
├── styles/tokens.css
├── payload.config.ts
└── payload-types.ts                # Generated — never hand-edit
tests/
├── unit/*.test.ts                  # Pure functions, no DB
├── int/*.int.spec.ts               # Requires Postgres
└── e2e/*.e2e.spec.ts               # Requires running app
scripts/seed.ts
Dockerfile  docker-compose.yml  .env.example
.github/workflows/ci.yml
docs/DEPLOYMENT.md
```

**Decomposition rationale:** `lib/` holds pure functions with no Payload or React imports, so they are unit-testable without a database or DOM. Collections are one file each — they change independently and a reviewer can accept one without reading the others. Components split by responsibility rather than by page, since `ProjectCard` is used by both the home page and the projects index.

---

### Task 1: Scaffold the app

**Files:**
- Create: entire project tree from the Payload blank template at tag `v3.87.1`
- Modify: `package.json`, `src/payload.config.ts`, `.env.example`, `tsconfig.json`
- Create: `src/app/api/health/route.ts`
- Create: `tests/int/health.int.spec.ts`
- Delete: `src/app/my-route/route.ts`, `src/app/(frontend)/page.tsx` demo content

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a booting Next.js + Payload app; the `@/*` → `./src/*` and `@payload-config` path aliases; `GET /api/health` returning `{ status: 'ok' }` with HTTP 200

- [ ] **Step 1: Fetch the template at the exact tag**

The interactive `create-payload-app` scaffolder prompts for a database and cannot be scripted reliably. Copy the blank template from the tagged source instead.

```bash
cd /Users/brianwells/career
TMP=$(mktemp -d)
git clone --depth 1 --branch v3.87.1 --filter=blob:none --sparse \
  https://github.com/payloadcms/payload.git "$TMP/payload"
git -C "$TMP/payload" sparse-checkout set templates/blank
# Copy everything except the template's own .gitignore (ours is better) and lockfiles
rsync -a \
  --exclude '.gitignore' \
  --exclude '.yarnrc' \
  --exclude 'pnpm-lock.yaml' \
  "$TMP/payload/templates/blank/" ./
rm -rf "$TMP"
rm -f src/app/my-route/route.ts
```

- [ ] **Step 2: Verify the expected files landed**

```bash
test -f src/payload.config.ts \
  && test -f 'src/app/(payload)/admin/[[...segments]]/page.tsx' \
  && test -f 'src/app/(frontend)/layout.tsx' \
  && echo "scaffold OK"
```

Expected: `scaffold OK`. If not, stop — the upstream template layout changed and this plan's paths need revisiting.

- [ ] **Step 3: Rewrite `package.json`**

The template uses `workspace:*` versions (monorepo-only) and pnpm. Replace the whole file:

```json
{
  "name": "brianwells-org",
  "version": "1.0.0",
  "description": "Personal portfolio site for Brian Wells",
  "license": "UNLICENSED",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "cross-env NODE_OPTIONS=\"--no-deprecation --max-old-space-size=8000\" next build",
    "dev": "cross-env NODE_OPTIONS=--no-deprecation next dev",
    "devsafe": "rm -rf .next && cross-env NODE_OPTIONS=--no-deprecation next dev",
    "start": "cross-env NODE_OPTIONS=--no-deprecation next start",
    "lint": "cross-env NODE_OPTIONS=--no-deprecation eslint .",
    "typecheck": "tsc --noEmit",
    "payload": "cross-env NODE_OPTIONS=--no-deprecation payload",
    "generate:types": "cross-env NODE_OPTIONS=--no-deprecation payload generate:types",
    "generate:importmap": "cross-env NODE_OPTIONS=--no-deprecation payload generate:importmap",
    "seed": "cross-env NODE_OPTIONS=\"--no-deprecation --import=tsx/esm\" tsx scripts/seed.ts",
    "test": "npm run test:unit && npm run test:int && npm run test:e2e",
    "test:unit": "vitest run --config ./vitest.config.mts",
    "test:int": "vitest run --config ./vitest.config.mts",
    "test:e2e": "cross-env NODE_OPTIONS=\"--no-deprecation --import=tsx/esm\" playwright test --config=playwright.config.ts"
  },
  "dependencies": {
    "@payloadcms/db-postgres": "3.87.1",
    "@payloadcms/next": "3.87.1",
    "@payloadcms/richtext-lexical": "3.87.1",
    "@payloadcms/storage-s3": "3.87.1",
    "@payloadcms/ui": "3.87.1",
    "cross-env": "^7.0.3",
    "dotenv": "16.4.7",
    "graphql": "^16.8.1",
    "next": "16.2.6",
    "payload": "3.87.1",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "resend": "6.19.0",
    "sharp": "0.34.2",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.58.2",
    "@testing-library/react": "16.3.0",
    "@types/node": "22.19.9",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "4.5.2",
    "eslint": "^9.16.0",
    "eslint-config-next": "16.2.6",
    "jsdom": "28.0.0",
    "prettier": "^3.4.2",
    "tsx": "4.22.4",
    "typescript": "5.7.3",
    "vite-tsconfig-paths": "6.0.5",
    "vitest": "4.0.18"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
```

Note the `pnpm` engine field and `onlyBuiltDependencies` block are deliberately dropped.

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: completes without peer-dependency errors. A warning about `sass` (an optional Next peer) is fine.

- [ ] **Step 5: Swap Mongo for Postgres in the Payload config**

Replace `src/payload.config.ts` entirely:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '' },
  }),
  sharp,
  plugins: [],
})
```

- [ ] **Step 6: Write `.env.example` and a local `.env`**

`.env.example` (committed, all values empty):

```
DATABASE_URI=
PAYLOAD_SECRET=
NEXT_PUBLIC_SERVER_URL=https://brianwells.org

R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=
R2_PUBLIC_URL=

RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

IP_HASH_SALT=
```

Then create a local, uncommitted `.env` pointing at a development database:

```bash
cat > .env <<'EOF'
DATABASE_URI=postgres://postgres:postgres@localhost:5433/brianwells_dev
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
EOF
echo "PAYLOAD_SECRET=$(openssl rand -hex 32)" >> .env
echo "IP_HASH_SALT=$(openssl rand -hex 32)" >> .env
```

Confirm `.env` is ignored:

```bash
git check-ignore -v .env
```

Expected: prints a match against `.gitignore`. If it prints nothing, stop and fix `.gitignore` before continuing.

- [ ] **Step 7: Write the failing health-check test**

`tests/int/health.int.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'

import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns 200 with status ok when the database is reachable', async () => {
    await getPayload({ config })
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 8: Point Vitest at both unit and integration tests**

Replace `vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/int/**/*.int.spec.ts'],
    testTimeout: 30_000,
  },
})
```

- [ ] **Step 9: Run the test to verify it fails**

A dedicated Postgres container is already running for this project — `brianwells-dev-db`
on host port **5433**, with `brianwells_dev` and `brianwells_test` created. Port 5432 on
this machine belongs to an unrelated project's database; never point at it. To confirm the
container is up:

```bash
docker exec brianwells-dev-db pg_isready -U postgres
```

Then:

```bash
npm run test:int
```

Expected: FAIL with a module-resolution error — `@/app/api/health/route` does not exist yet.

- [ ] **Step 10: Implement the health endpoint**

`src/app/api/health/route.ts`:

```ts
import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    // Exercises a real query through the configured adapter.
    await payload.count({ collection: 'users' })
    return Response.json({ status: 'ok' }, { status: 200 })
  } catch {
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
```

`/api/health` is a static segment and takes precedence over Payload's `(payload)/api/[...slug]` catch-all, so it does not conflict.

- [ ] **Step 11: Run the test to verify it passes**

```bash
npm run test:int
```

Expected: PASS, 1 test.

- [ ] **Step 12: Verify the app and admin boot**

```bash
npm run dev
```

Visit `http://localhost:3000/admin`. Expected: Payload's "create first user" screen. Create an admin account. Then stop the dev server.

- [ ] **Step 13: Generate types and commit**

```bash
npm run generate:types
git add -A
git commit -m "feat: scaffold Next.js 16 + Payload 3.87.1 app on Postgres

Adds a /api/health endpoint that verifies database connectivity, used
by the container healthcheck."
```

---

### Task 2: Design tokens with an enforced contrast test

**Files:**
- Create: `src/styles/tokens.css`
- Create: `tests/unit/contrast.test.ts`
- Modify: `src/app/(frontend)/styles.css`

**Interfaces:**
- Consumes: nothing
- Produces: CSS custom properties consumed by every component — `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-accent`, `--color-accent-hover`, `--color-accent-contrast`, `--radius-card`, `--radius-pill`, `--font-sans`, `--space-1` … `--space-16`, `--measure`

- [ ] **Step 1: Write the failing contrast test**

This test parses the real token file, so it cannot drift from the CSS. It enforces the spec's WCAG AA requirement.

`tests/unit/contrast.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/tokens.css', 'utf8')

/** Extracts custom properties from the Nth `:root { ... }` block. */
function tokenBlock(index: number): Record<string, string> {
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)]
  const body = blocks[index]?.[1]
  if (!body) throw new Error(`No :root block at index ${index}`)
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim()
  }
  return out
}

function channel(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Not a 6-digit hex color: ${hex}`)
  const int = parseInt(m[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function luminance(hex: string): number {
  const srgb = channel(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const themes: Array<[string, number]> = [
  ['light', 0],
  ['dark', 1],
]

describe.each(themes)('%s theme contrast', (_name, index) => {
  const t = () => tokenBlock(index)

  it('body text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text-muted'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on surface meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text-muted'], tok['--color-surface'])).toBeGreaterThanOrEqual(4.5)
  })

  it('accent as link text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-accent'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('button label on accent fill meets AA (4.5:1)', () => {
    const tok = t()
    expect(
      contrast(tok['--color-accent-contrast'], tok['--color-accent']),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('error text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-error'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('error text on surface meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-error'], tok['--color-surface'])).toBeGreaterThanOrEqual(4.5)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — `ENOENT: no such file or directory, open 'src/styles/tokens.css'`.

- [ ] **Step 3: Write the tokens**

`src/styles/tokens.css`. The light block must be first and the dark block second — the test indexes them by position.

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #fbf9f7;
  --color-border: #e8e3dd;
  --color-text: #1c1b1a;
  --color-text-muted: #5c5852;
  --color-accent: #0f766e;
  --color-accent-hover: #0b5d57;
  --color-accent-contrast: #ffffff;
  --color-accent-soft: #e6f4f2;
  --color-error: #b3261e;

  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto,
    'Helvetica Neue', Arial, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;

  --radius-card: 14px;
  --radius-pill: 999px;
  --radius-thumb: 9px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  --measure: 68ch;
  --page-max: 1080px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #131211;
    --color-surface: #1c1a18;
    --color-border: #2e2a26;
    --color-text: #f0ede9;
    --color-text-muted: #a8a19a;
    --color-accent: #2dd4bf;
    --color-accent-hover: #5eead4;
    --color-accent-contrast: #0b1614;
    --color-accent-soft: #16302c;
    --color-error: #f2b8b5;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit
```

Expected: PASS, 14 tests. If any pairing fails, darken or lighten the offending token until it passes — do not weaken the assertion.

- [ ] **Step 5: Wire tokens into global styles**

Replace `src/app/(frontend)/styles.css`:

```css
@import '../../styles/tokens.css';

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
h4 {
  margin: 0 0 var(--space-4);
  line-height: 1.15;
  letter-spacing: -0.025em;
  font-weight: 650;
}

h1 { font-size: clamp(2rem, 1.4rem + 2.4vw, 2.75rem); }
h2 { font-size: clamp(1.5rem, 1.2rem + 1.2vw, 1.875rem); }
h3 { font-size: 1.25rem; }

p { margin: 0 0 var(--space-4); max-width: var(--measure); }

a {
  color: var(--color-accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

a:hover { color: var(--color-accent-hover); }

img { max-width: 100%; height: auto; }

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css "src/app/(frontend)/styles.css" tests/unit/contrast.test.ts
git commit -m "feat: add warm-minimal design tokens with enforced WCAG AA contrast tests"
```

---

### Task 3: Layout shell

**Files:**
- Create: `src/components/ui/Container.tsx`, `src/components/ui/Section.tsx`
- Create: `src/components/Header.tsx`, `src/components/Footer.tsx`
- Create: `src/components/layout.module.css`
- Modify: `src/app/(frontend)/layout.tsx`
- Replace: `src/app/(frontend)/page.tsx`
- Create: `tests/e2e/shell.e2e.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Consumes: tokens from Task 2
- Produces: `<Container>`, `<Section>`, `<Header>`, `<Footer>`; a root layout wrapping all frontend pages; nav links to `/projects`, `/experience`, `/about`, `/contact`

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/shell.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('header exposes primary navigation', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Work' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Experience' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'About' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Contact' })).toBeVisible()
})

test('footer renders without empty contact links', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toBeVisible()
  // Contact details are unset at launch: no mailto link should exist at all.
  await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0)
  await expect(footer.locator('a[href=""]')).toHaveCount(0)
})

test('skip link is the first focusable element', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
})
```

- [ ] **Step 2: Configure Playwright**

Replace `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: FAIL — no navigation landmark named "Primary".

- [ ] **Step 4: Build the layout primitives**

`src/components/ui/Container.tsx`:

```tsx
import type { ReactNode } from 'react'
import styles from '../layout.module.css'

export function Container({ children }: { children: ReactNode }) {
  return <div className={styles.container}>{children}</div>
}
```

`src/components/ui/Section.tsx`:

```tsx
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
```

`src/components/layout.module.css`:

```css
.container {
  width: 100%;
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.section { padding: var(--space-12) 0; }
.sectionTitle { margin-bottom: var(--space-8); }

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--color-bg) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-border);
}

.headerInner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  min-height: 64px;
}

.brand {
  font-weight: 650;
  color: var(--color-text);
  text-decoration: none;
  letter-spacing: -0.02em;
}

.nav { display: flex; gap: var(--space-6); }

.nav a {
  color: var(--color-text-muted);
  text-decoration: none;
  font-size: 0.9375rem;
}

.nav a:hover { color: var(--color-accent); }

.skipLink {
  position: absolute;
  left: -9999px;
  top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  border-radius: var(--radius-pill);
  z-index: 20;
}

.skipLink:focus {
  left: var(--space-4);
  color: var(--color-accent-contrast);
}

.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-8) 0;
  margin-top: var(--space-16);
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.footerInner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  justify-content: space-between;
}

.footerLinks { display: flex; gap: var(--space-4); }

@media (max-width: 640px) {
  .nav { gap: var(--space-4); }
  .nav a { font-size: 0.875rem; }
}
```

- [ ] **Step 5: Build Header and Footer**

`src/components/Header.tsx`:

```tsx
import Link from 'next/link'
import { Container } from './ui/Container'
import styles from './layout.module.css'

const NAV = [
  { href: '/projects', label: 'Work' },
  { href: '/experience', label: 'Experience' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

export function Header({ name }: { name: string }) {
  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand}>
            {name}
          </Link>
          <nav className={styles.nav} aria-label="Primary">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </Container>
    </header>
  )
}
```

`src/components/Footer.tsx`. Note the conditional rendering required by the global constraints — nothing renders for unset values.

```tsx
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
```

- [ ] **Step 6: Wire the root layout**

Replace `src/app/(frontend)/layout.tsx`:

```tsx
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
```

Site settings replace these hardcoded props in Task 7.

- [ ] **Step 7: Replace the demo home page**

`src/app/(frontend)/page.tsx`:

```tsx
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'

export default function HomePage() {
  return (
    <Container>
      <Section>
        <h1>Brian Wells</h1>
        <p>Software and infrastructure engineer.</p>
      </Section>
    </Container>
  )
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm run test:e2e
```

Expected: PASS, 3 tests.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add layout shell with header, footer, and skip link

Footer omits contact links entirely when unset, per spec."
```

---

### Task 4: Media collection on R2

**Files:**
- Modify: `src/collections/Media.ts`
- Modify: `src/payload.config.ts`
- Create: `tests/int/media.int.spec.ts`

**Interfaces:**
- Consumes: Payload config from Task 1
- Produces: `media` collection with required `alt`, and named image sizes `thumbnail`, `card`, `hero`, `og`. Other collections reference it via `relationTo: 'media'`.

- [ ] **Step 1: Write the failing test**

`tests/int/media.int.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'

describe('media collection', () => {
  it('requires alt text', async () => {
    const payload = await getPayload({ config })
    const field = payload.collections.media.config.fields.find(
      (f) => 'name' in f && f.name === 'alt',
    )
    expect(field).toBeDefined()
    expect(field && 'required' in field && field.required).toBe(true)
  })

  it('defines the four named image sizes', async () => {
    const payload = await getPayload({ config })
    const sizes = payload.collections.media.config.upload
    const names = (typeof sizes === 'object' && sizes.imageSizes ? sizes.imageSizes : []).map(
      (s) => s.name,
    )
    expect(names).toEqual(['thumbnail', 'card', 'hero', 'og'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:int
```

Expected: FAIL — image sizes array is empty.

- [ ] **Step 3: Implement the collection**

Replace `src/collections/Media.ts`:

```ts
import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'alt',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description: 'Describe the image for screen readers and when it fails to load.',
      },
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
  upload: {
    imageSizes: [
      { name: 'thumbnail', width: 400, height: undefined, position: 'centre' },
      { name: 'card', width: 768, height: undefined, position: 'centre' },
      { name: 'hero', width: 1600, height: undefined, position: 'centre' },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    mimeTypes: ['image/*', 'application/pdf'],
    focalPoint: true,
  },
}
```

`application/pdf` is allowed because the resume PDF is stored in this collection.

- [ ] **Step 4: Add the R2 storage plugin**

In `src/payload.config.ts`, add the import and replace `plugins: []`:

```ts
import { s3Storage } from '@payloadcms/storage-s3'
```

```ts
  plugins: [
    s3Storage({
      // Falls back to local disk in development when R2 is not configured.
      enabled: Boolean(process.env.R2_BUCKET),
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const key = prefix ? `${prefix}/${filename}` : filename
            return `${process.env.R2_PUBLIC_URL}/${key}`
          },
        },
      },
      bucket: process.env.R2_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
      },
    }),
  ],
```

`region: 'auto'` and `forcePathStyle: true` are required by R2's S3 API. `disablePayloadAccessControl` plus `generateFileURL` makes images serve from the public R2 domain instead of streaming through Node.

- [ ] **Step 5: Allow remote images from the R2 domain**

In `next.config.ts`, extend the `images` block:

```ts
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: [{ protocol: 'https', hostname: 'media.brianwells.org' }],
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:int
```

Expected: PASS, 3 tests total.

- [ ] **Step 7: Regenerate types and commit**

```bash
npm run generate:types
git add -A
git commit -m "feat: back media uploads with Cloudflare R2 and require alt text"
```

---

### Task 5: Projects collection

**Files:**
- Create: `src/lib/slug.ts`, `src/lib/revalidate.ts`, `src/collections/Projects.ts`
- Create: `tests/unit/slug.test.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: `media` collection from Task 4
- Produces: `slugify(input: string): string`; `revalidateCollection(paths: (doc) => string[])` hook factories; `projects` collection with fields `title`, `slug`, `summary`, `coverImage`, `gallery`, `role`, `timeframe`, `techStack`, `repoUrl`, `liveUrl`, `body`, `featured`, `order`, plus drafts

- [ ] **Step 1: Write the failing slug test**

`tests/unit/slug.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slugify } from '@/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('Portside Pottery')).toBe('portside-pottery')
  })

  it('strips punctuation', () => {
    expect(slugify('AI/ML Model Deployment!')).toBe('ai-ml-model-deployment')
  })

  it('collapses runs of separators', () => {
    expect(slugify('Hadoop  &&  Spark')).toBe('hadoop-spark')
  })

  it('trims leading and trailing separators', () => {
    expect(slugify('  --Swift Audiobook Player--  ')).toBe('swift-audiobook-player')
  })

  it('removes diacritics', () => {
    expect(slugify('Café Cluster')).toBe('cafe-cluster')
  })

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('!!!')).toBe('')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — cannot resolve `@/lib/slug`.

- [ ] **Step 3: Implement `slugify`**

`src/lib/slug.ts`:

```ts
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit
```

Expected: PASS, 20 tests total (14 contrast + 6 slug).

- [ ] **Step 5: Write the revalidation helpers**

`src/lib/revalidate.ts`:

```ts
import { revalidatePath } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

type PathsFor<T> = (doc: T) => string[]

export function revalidateAfterChange<T>(paths: PathsFor<T>): CollectionAfterChangeHook {
  return ({ doc, previousDoc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    const targets = new Set([...paths(doc as T), ...(previousDoc ? paths(previousDoc as T) : [])])
    for (const path of targets) revalidatePath(path)
    return doc
  }
}

export function revalidateAfterDelete<T>(paths: PathsFor<T>): CollectionAfterDeleteHook {
  return ({ doc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    for (const path of paths(doc as T)) revalidatePath(path)
    return doc
  }
}

export function revalidateGlobal(paths: string[]): GlobalAfterChangeHook {
  return ({ doc, req: { context } }) => {
    if (context.disableRevalidate) return doc
    for (const path of paths) revalidatePath(path)
    return doc
  }
}
```

The `disableRevalidate` context flag lets the seed script write without triggering revalidation outside a request scope.

- [ ] **Step 6: Implement the Projects collection**

`src/collections/Projects.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { slugify } from '@/lib/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

type ProjectDoc = { slug?: string | null }

const projectPaths = (doc: ProjectDoc): string[] => [
  '/',
  '/projects',
  ...(doc.slug ? [`/projects/${doc.slug}`] : []),
]

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'order', 'updatedAt'],
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [revalidateAfterChange<ProjectDoc>(projectPaths)],
    afterDelete: [revalidateAfterDelete<ProjectDoc>(projectPaths)],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Auto-generated from the title when left blank.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim()) return slugify(value)
            if (data?.title) return slugify(String(data.title))
            return value
          },
        ],
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: { description: 'One or two sentences. Used on cards and as the meta description.' },
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media', required: true },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'role', type: 'text', admin: { description: 'What you personally did.' } },
    { name: 'timeframe', type: 'text', admin: { description: 'e.g. 2024–2025' } },
    {
      name: 'techStack',
      type: 'array',
      fields: [{ name: 'name', type: 'text', required: true }],
    },
    { name: 'repoUrl', type: 'text' },
    { name: 'liveUrl', type: 'text' },
    { name: 'body', type: 'richText' },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Featured projects appear on the homepage.' },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
```

- [ ] **Step 7: Register the collection**

In `src/payload.config.ts`, add `import { Projects } from './collections/Projects'` and change `collections` to `[Users, Media, Projects]`.

- [ ] **Step 8: Verify types generate and the app builds**

```bash
npm run generate:types
npm run typecheck
```

Expected: both succeed; `src/payload-types.ts` now exports a `Project` type.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add projects collection with auto-slug and on-demand revalidation"
```

---

### Task 6: Experience and Education collections

**Files:**
- Create: `src/lib/format.ts`, `src/collections/Experience.ts`, `src/collections/Education.ts`
- Create: `tests/unit/format.test.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: `revalidateAfterChange` / `revalidateAfterDelete` from Task 5
- Produces: `formatMonthYear(value: string | Date): string`; `formatDateRange(start: string, end?: string | null, current?: boolean): string`; `experience` and `education` collections

- [ ] **Step 1: Write the failing date-formatting test**

`tests/unit/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatDateRange, formatMonthYear } from '@/lib/format'

describe('formatMonthYear', () => {
  it('formats an ISO date as abbreviated month and year in UTC', () => {
    expect(formatMonthYear('2025-08-01T00:00:00.000Z')).toBe('Aug 2025')
  })

  it('does not shift across a month boundary due to local timezone', () => {
    expect(formatMonthYear('2024-01-01T00:00:00.000Z')).toBe('Jan 2024')
  })
})

describe('formatDateRange', () => {
  it('renders Present for a current role', () => {
    expect(formatDateRange('2025-08-01T00:00:00.000Z', null, true)).toBe('Aug 2025 – Present')
  })

  it('renders a closed range', () => {
    expect(
      formatDateRange('2024-01-01T00:00:00.000Z', '2025-08-01T00:00:00.000Z', false),
    ).toBe('Jan 2024 – Aug 2025')
  })

  it('renders only the start when there is no end and it is not current', () => {
    expect(formatDateRange('2021-05-01T00:00:00.000Z', null, false)).toBe('May 2021')
  })

  it('ignores endDate when current is true', () => {
    expect(
      formatDateRange('2025-08-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', true),
    ).toBe('Aug 2025 – Present')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — cannot resolve `@/lib/format`.

- [ ] **Step 3: Implement the formatters**

`src/lib/format.ts`:

```ts
const MONTH_YEAR = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonthYear(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${String(value)}`)
  return MONTH_YEAR.format(date)
}

export function formatDateRange(
  start: string,
  end?: string | null,
  current?: boolean,
): string {
  const startLabel = formatMonthYear(start)
  if (current) return `${startLabel} – Present`
  if (!end) return startLabel
  return `${startLabel} – ${formatMonthYear(end)}`
}
```

The separator is an en dash (U+2013), matching the test.

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit
```

Expected: PASS, 26 tests total.

- [ ] **Step 5: Implement the Experience collection**

`src/collections/Experience.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

const paths = () => ['/', '/experience']

export const Experience: CollectionConfig = {
  slug: 'experience',
  labels: { singular: 'Experience', plural: 'Experience' },
  access: { read: () => true },
  admin: {
    useAsTitle: 'company',
    defaultColumns: ['company', 'role', 'startDate', 'current'],
  },
  hooks: {
    afterChange: [revalidateAfterChange(paths)],
    afterDelete: [revalidateAfterDelete(paths)],
  },
  fields: [
    { name: 'company', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'startDate', type: 'date', required: true },
    {
      name: 'current',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'When checked, the end date is ignored and "Present" is shown.' },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: { condition: (data) => !data?.current },
    },
    {
      name: 'bullets',
      type: 'array',
      labels: { singular: 'Bullet', plural: 'Bullets' },
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
```

- [ ] **Step 6: Implement the Education collection**

`src/collections/Education.ts`:

```ts
import type { CollectionConfig } from 'payload'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

const paths = () => ['/experience']

export const Education: CollectionConfig = {
  slug: 'education',
  labels: { singular: 'Education', plural: 'Education' },
  access: { read: () => true },
  admin: { useAsTitle: 'degree', defaultColumns: ['degree', 'school', 'date'] },
  hooks: {
    afterChange: [revalidateAfterChange(paths)],
    afterDelete: [revalidateAfterDelete(paths)],
  },
  fields: [
    { name: 'school', type: 'text', required: true },
    { name: 'degree', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
```

- [ ] **Step 7: Register both collections**

In `src/payload.config.ts`, import them and set `collections: [Users, Media, Projects, Experience, Education]`.

- [ ] **Step 8: Verify and commit**

```bash
npm run generate:types && npm run typecheck && npm run test:unit
git add -A
git commit -m "feat: add experience and education collections with date formatting helpers"
```

---

### Task 7: Globals and contact-link filtering

**Files:**
- Create: `src/lib/links.ts`, `src/globals/SiteSettings.ts`, `src/globals/About.ts`, `src/globals/Skills.ts`
- Create: `tests/unit/links.test.ts`
- Modify: `src/payload.config.ts`, `src/app/(frontend)/layout.tsx`

**Interfaces:**
- Consumes: `revalidateGlobal` from Task 5; `media` from Task 4
- Produces: `presentLinks(links)` returning only entries with a non-empty URL; globals `site-settings`, `about`, `skills`; a root layout that reads `site-settings`

- [ ] **Step 1: Write the failing link-filter test**

This test encodes the global constraint that unset contact fields must produce no DOM.

`tests/unit/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { presentLinks } from '@/lib/links'

describe('presentLinks', () => {
  it('returns an empty array for null', () => {
    expect(presentLinks(null)).toEqual([])
  })

  it('returns an empty array for undefined', () => {
    expect(presentLinks(undefined)).toEqual([])
  })

  it('drops entries with a null url', () => {
    expect(presentLinks([{ platform: 'GitHub', url: null }])).toEqual([])
  })

  it('drops entries with a whitespace-only url', () => {
    expect(presentLinks([{ platform: 'LinkedIn', url: '   ' }])).toEqual([])
  })

  it('keeps entries with a real url and trims it', () => {
    expect(presentLinks([{ platform: 'GitHub', url: ' https://github.com/briswells ' }])).toEqual([
      { platform: 'GitHub', url: 'https://github.com/briswells' },
    ])
  })

  it('drops entries with an empty platform label', () => {
    expect(presentLinks([{ platform: '', url: 'https://example.com' }])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — cannot resolve `@/lib/links`.

- [ ] **Step 3: Implement `presentLinks`**

`src/lib/links.ts`:

```ts
export type MaybeLink = { platform?: string | null; url?: string | null }
export type PresentLink = { platform: string; url: string }

export function presentLinks(links: MaybeLink[] | null | undefined): PresentLink[] {
  if (!links) return []
  const out: PresentLink[] = []
  for (const link of links) {
    const platform = link.platform?.trim()
    const url = link.url?.trim()
    if (platform && url) out.push({ platform, url })
  }
  return out
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm run test:unit
```

Expected: PASS, 32 tests total.

- [ ] **Step 5: Implement the globals**

`src/globals/SiteSettings.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: { read: () => true },
  hooks: {
    afterChange: [revalidateGlobal(['/', '/projects', '/experience', '/about', '/contact'])],
  },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'Brian Wells' },
    { name: 'tagline', type: 'text' },
    { name: 'heroHeadline', type: 'textarea' },
    {
      name: 'availabilityStatus',
      type: 'text',
      admin: { description: 'Short status shown in the hero. Leave blank to hide it.' },
    },
    {
      name: 'publicEmail',
      type: 'text',
      admin: { description: 'Leave blank to omit the email link entirely.' },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    { name: 'resumePdf', type: 'upload', relationTo: 'media' },
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
```

`src/globals/About.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const About: GlobalConfig = {
  slug: 'about',
  label: 'About',
  access: { read: () => true },
  hooks: { afterChange: [revalidateGlobal(['/', '/about'])] },
  fields: [
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
  ],
}
```

`src/globals/Skills.ts`:

```ts
import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const Skills: GlobalConfig = {
  slug: 'skills',
  label: 'Skills',
  access: { read: () => true },
  hooks: { afterChange: [revalidateGlobal(['/experience'])] },
  fields: [
    {
      name: 'groups',
      type: 'array',
      labels: { singular: 'Group', plural: 'Groups' },
      fields: [
        { name: 'category', type: 'text', required: true },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'name', type: 'text', required: true }],
        },
      ],
    },
  ],
}
```

- [ ] **Step 6: Register the globals**

In `src/payload.config.ts`, import all three and add `globals: [SiteSettings, About, Skills],` after the `collections` key.

- [ ] **Step 7: Read settings in the root layout**

Replace `src/app/(frontend)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import styles from '@/components/layout.module.css'
import { presentLinks } from '@/lib/links'
import './styles.css'

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  const name = settings.name || 'Brian Wells'

  return (
    <html lang="en">
      <body>
        <a href="#content" className={styles.skipLink}>
          Skip to content
        </a>
        <Header name={name} />
        <main id="content">{children}</main>
        <Footer
          name={name}
          email={settings.publicEmail}
          links={presentLinks(settings.socialLinks)}
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Verify and commit**

```bash
npm run generate:types && npm run typecheck && npm run test:unit && npm run test:e2e
git add -A
git commit -m "feat: add site settings, about, and skills globals

Contact links are filtered through presentLinks so unset values render nothing."
```

---

### Task 8: Idempotent seed script

**Files:**
- Create: `scripts/seed.ts`
- Create: `tests/int/seed.int.spec.ts`

**Interfaces:**
- Consumes: all collections and globals from Tasks 4–7
- Produces: `seed(payload: Payload): Promise<void>` exported from `scripts/seed.ts`, safe to run repeatedly

- [ ] **Step 1: Write the failing idempotency test**

`tests/int/seed.int.spec.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { seed } from '../../scripts/seed'

let payload: Payload

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('seed', () => {
  it('creates the expected content on first run', async () => {
    await seed(payload)
    const projects = await payload.count({ collection: 'projects' })
    const experience = await payload.count({ collection: 'experience' })
    const education = await payload.count({ collection: 'education' })
    expect(projects.totalDocs).toBe(4)
    expect(experience.totalDocs).toBe(3)
    expect(education.totalDocs).toBe(2)
  })

  it('does not duplicate records when run again', async () => {
    await seed(payload)
    await seed(payload)
    const projects = await payload.count({ collection: 'projects' })
    const experience = await payload.count({ collection: 'experience' })
    const education = await payload.count({ collection: 'education' })
    expect(projects.totalDocs).toBe(4)
    expect(experience.totalDocs).toBe(3)
    expect(education.totalDocs).toBe(2)
  })

  it('populates the skills global with the five resume groupings', async () => {
    await seed(payload)
    const skills = await payload.findGlobal({ slug: 'skills' })
    expect(skills.groups?.map((g) => g.category)).toEqual([
      'Languages',
      'Datastores',
      'Web Frameworks',
      'Infrastructure & Cloud',
      'CI/CD',
    ])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:int
```

Expected: FAIL — cannot resolve `../../scripts/seed`.

- [ ] **Step 3: Implement the seed script**

Idempotency comes from upserting on a natural key: `slug` for projects, `company` + `role` for experience, `degree` for education. Projects are seeded without a `coverImage` because that field is only required for admin-created documents; images are attached by hand through the CMS.

`scripts/seed.ts`:

```ts
import 'dotenv/config'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

const PROJECTS = [
  {
    slug: 'portside-pottery',
    title: 'Portside Pottery',
    summary:
      'Production website and booking platform for a pottery studio, handling payments through Square with an admin backed by Payload.',
    role: 'Sole engineer — design, build, deploy, and ongoing maintenance.',
    timeframe: '2025',
    techStack: ['Next.js', 'Payload', 'Postgres', 'Square'],
    liveUrl: 'https://portsidepottery.com',
    featured: true,
    order: 0,
  },
  {
    slug: 'swift-audiobook-player',
    title: 'Swift Audiobook Player',
    summary:
      'Native iOS client for a self-hosted audiobook platform, covering library browsing, playback, and progress sync.',
    role: 'Frontend iOS development.',
    timeframe: '2024',
    techStack: ['Swift', 'SwiftUI', 'iOS'],
    featured: true,
    order: 1,
  },
  {
    slug: 'ai-model-deployment-pipeline',
    title: 'AI Model Deployment Pipeline',
    summary:
      'CI/CD pipeline automating AI model training and deployment, removing the manual handoff between training runs and serving.',
    role: 'Pipeline design and implementation.',
    timeframe: '2024',
    techStack: ['GitLab CI', 'Python', 'Docker'],
    featured: true,
    order: 2,
  },
  {
    slug: 'distributed-computing-cluster',
    title: 'Distributed Computing Cluster',
    summary:
      'Scalable computing resources including distributed databases and compute clusters, built across the Hadoop and Spark ecosystem.',
    role: 'Cluster architecture and administration.',
    timeframe: '2023–2024',
    techStack: ['Hadoop', 'HDFS', 'Apache Spark', 'Lustre'],
    featured: false,
    order: 3,
  },
]

const EXPERIENCE = [
  {
    company: 'PRE Security',
    role: 'Full Stack Founding Engineer (Early Team)',
    location: 'Remote',
    startDate: '2025-08-01T00:00:00.000Z',
    current: true,
    order: 0,
    bullets: [
      'Architected a Kubernetes-based platform for dynamic data ingress and egress across tenant systems.',
      'Created Go microservices for multi-tenant alerting, RBAC enforcement, and object storage.',
      'Developed an agentic AI chatbot using Agno and the OpenAI SDK, integrating 100+ tools across distributed MCP servers.',
      'Improved prompt engineering for AI-native tools, raising the consistency, reliability, and actionability of outputs.',
      'Built self-service Elasticsearch clustering for monitoring, provisioning, and scaling without backend access.',
      'Designed CI/CD pipelines using GitHub Actions and QEMU to produce golden VM images.',
      'Implemented a WebSocket mesh connection system letting tenants and firewall-protected resources exchange data.',
      'Created an AI pipeline for new integrations using templates, structured prompts, and automated testing.',
    ],
  },
  {
    company: 'Sun Ridge Systems Inc.',
    role: 'Interface Developer',
    location: 'Remote',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2025-08-01T00:00:00.000Z',
    current: false,
    order: 1,
    bullets: [
      'Optimized legacy applications with modern practices including polymorphism, shared classes, and data encapsulation.',
      'Worked directly with clients to determine project specifications, resource allocation, and technical requirements.',
      'Designed and deployed complete REST API interfaces for data exchange.',
      'Updated backend services and Delphi frontend applications for seamless interfacing with external systems.',
      'Built real-time communication systems over TCP sockets to facilitate mission-critical data sharing.',
    ],
  },
  {
    company: 'CSU Chico — IT Support Services',
    role: 'IT Consultant',
    location: 'Chico, CA',
    startDate: '2021-06-01T00:00:00.000Z',
    endDate: '2024-01-01T00:00:00.000Z',
    current: false,
    order: 2,
    bullets: [
      'Monitored servers using Splunk and Qualys for security and compliance.',
      'Developed a Python data pipeline moving data from an internal mail service application into Microsoft Power BI.',
      'Created a C# API to automate door control system updates for enhanced security.',
      'Administered MSSQL databases and Windows environments.',
    ],
  },
]

const EDUCATION = [
  {
    school: 'California State University, Chico',
    degree: 'Master of Science in Computer Science',
    date: '2024-12-01T00:00:00.000Z',
    order: 0,
  },
  {
    school: 'California State University, Chico',
    degree: 'Bachelor of Science in Computer Science',
    date: '2021-05-01T00:00:00.000Z',
    order: 1,
  },
]

const SKILL_GROUPS = [
  {
    category: 'Languages',
    items: ['Python', 'Go', 'TypeScript', 'Delphi', 'C#', 'SQL', 'JavaScript', 'PowerShell', 'Bash'],
  },
  {
    category: 'Datastores',
    items: ['Elasticsearch', 'Postgres', 'pgvector', 'Redis', 'MSSQL', 'MinIO', 'Milvus'],
  },
  { category: 'Web Frameworks', items: ['React', 'Next.js', 'Alpine.js', 'Django'] },
  {
    category: 'Infrastructure & Cloud',
    items: ['Kubernetes', 'Docker', 'Google Cloud', 'Amazon Web Services'],
  },
  { category: 'CI/CD', items: ['GitHub Actions', 'GitLab CI'] },
]

/** Skips revalidation: the seed runs outside a Next.js request scope. */
const ctx = { disableRevalidate: true }

export async function seed(payload: Payload): Promise<void> {
  for (const project of PROJECTS) {
    const { techStack, ...rest } = project
    const data = {
      ...rest,
      techStack: techStack.map((name) => ({ name })),
      _status: 'published' as const,
    }
    const existing = await payload.find({
      collection: 'projects',
      where: { slug: { equals: project.slug } },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'projects',
        id: existing.docs[0].id,
        data,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'projects', data, context: ctx })
    }
  }

  for (const item of EXPERIENCE) {
    const { bullets, ...rest } = item
    const data = { ...rest, bullets: bullets.map((text) => ({ text })) }
    const existing = await payload.find({
      collection: 'experience',
      where: { and: [{ company: { equals: item.company } }, { role: { equals: item.role } }] },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'experience',
        id: existing.docs[0].id,
        data,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'experience', data, context: ctx })
    }
  }

  for (const item of EDUCATION) {
    const existing = await payload.find({
      collection: 'education',
      where: { degree: { equals: item.degree } },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'education',
        id: existing.docs[0].id,
        data: item,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'education', data: item, context: ctx })
    }
  }

  await payload.updateGlobal({
    slug: 'skills',
    data: {
      groups: SKILL_GROUPS.map((group) => ({
        category: group.category,
        items: group.items.map((name) => ({ name })),
      })),
    },
    context: ctx,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      name: 'Brian Wells',
      tagline: 'Software & infrastructure engineer',
      heroHeadline: 'I build and run the systems software depends on.',
    },
    context: ctx,
  })
}

// Allow `npm run seed` to execute this file directly.
if (process.argv[1]?.endsWith('seed.ts')) {
  const payload = await getPayload({ config })
  await seed(payload)
  payload.logger.info('Seed complete.')
  process.exit(0)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm run test:int
```

Expected: PASS. The idempotency test is the important one — if counts grow on the second run, the natural-key lookup is wrong.

- [ ] **Step 5: Seed the development database and inspect it**

```bash
npm run seed
npm run dev
```

Visit `http://localhost:3000/admin/collections/projects`. Expected: four projects. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add idempotent seed script populating content from resume"
```

---

### Task 9: UI primitives and ProjectCard

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Tag.tsx`, `src/components/ui/ui.module.css`
- Create: `src/components/ProjectCard.tsx`, `src/components/ProjectGrid.tsx`, `src/components/project.module.css`
- Create: `src/components/RichText.tsx`
- Create: `tests/unit/project-card.test.tsx`
- Modify: `vitest.config.mts`

**Interfaces:**
- Consumes: tokens from Task 2; the `Project` and `Media` types generated in Tasks 4–5
- Produces: `<Button href variant="solid"|"ghost">`, `<Tag>`, `<ProjectCard project>`, `<ProjectGrid projects>`, `<RichText data>`

- [ ] **Step 1: Allow `.tsx` tests**

In `vitest.config.mts`, change `include` to:

```ts
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'tests/int/**/*.int.spec.ts'],
```

- [ ] **Step 2: Write the failing component test**

`tests/unit/project-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProjectCard } from '@/components/ProjectCard'
import type { Project } from '@/payload-types'

// The generated Project type has many required fields this component never reads.
// Casting keeps the fixture focused on what ProjectCard actually consumes.
const base = {
  id: 1,
  title: 'Portside Pottery',
  slug: 'portside-pottery',
  summary: 'Production website and booking platform.',
  techStack: [
    { id: 'a', name: 'Next.js' },
    { id: 'b', name: 'Payload' },
  ],
  coverImage: null,
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
} as unknown as Project

describe('ProjectCard', () => {
  it('links to the project detail page', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByRole('link', { name: /Portside Pottery/ })).toHaveAttribute(
      'href',
      '/projects/portside-pottery',
    )
  })

  it('renders the summary', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByText('Production website and booking platform.')).toBeDefined()
  })

  it('renders each tech stack tag', () => {
    render(<ProjectCard project={base} />)
    expect(screen.getByText('Next.js')).toBeDefined()
    expect(screen.getByText('Payload')).toBeDefined()
  })

  it('renders no image element when there is no cover image', () => {
    const { container } = render(<ProjectCard project={base} />)
    expect(container.querySelector('img')).toBeNull()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm run test:unit
```

Expected: FAIL — cannot resolve `@/components/ProjectCard`.

- [ ] **Step 4: Build the UI primitives**

`src/components/ui/ui.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9375rem;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.solid {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.solid:hover {
  background: var(--color-accent-hover);
  color: var(--color-accent-contrast);
}

.ghost {
  background: transparent;
  color: var(--color-text);
  border-color: var(--color-border);
}

.ghost:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.tag {
  display: inline-block;
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-text-muted);
}
```

`src/components/ui/Button.tsx`:

```tsx
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
```

`src/components/ui/Tag.tsx`:

```tsx
import styles from './ui.module.css'

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className={styles.tag}>{children}</span>
}
```

- [ ] **Step 5: Build ProjectCard and ProjectGrid**

`src/components/project.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-6);
}

.card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.card:hover { border-color: var(--color-accent); }

.thumb {
  aspect-ratio: 16 / 9;
  object-fit: cover;
  width: 100%;
  display: block;
  border-bottom: 1px solid var(--color-border);
}

.body { padding: var(--space-5, 20px); display: flex; flex-direction: column; gap: var(--space-3); }

.title { margin: 0; font-size: 1.125rem; }

.title a { color: var(--color-text); text-decoration: none; }
.title a:hover { color: var(--color-accent); }

.summary { margin: 0; font-size: 0.9375rem; color: var(--color-text-muted); }

.tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
```

`src/components/ProjectCard.tsx`:

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Media, Project } from '@/payload-types'
import { Tag } from './ui/Tag'
import styles from './project.module.css'

function coverOf(project: Project): Media | null {
  const cover = project.coverImage
  return cover && typeof cover === 'object' ? cover : null
}

export function ProjectCard({ project }: { project: Project }) {
  const cover = coverOf(project)
  const tags = (project.techStack ?? []).filter((t) => Boolean(t.name))

  return (
    <article className={styles.card}>
      {cover?.url ? (
        <Image
          className={styles.thumb}
          src={cover.url}
          alt={cover.alt}
          width={768}
          height={432}
        />
      ) : null}
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p className={styles.summary}>{project.summary}</p>
        {tags.length > 0 ? (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <Tag key={tag.id ?? tag.name}>{tag.name}</Tag>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
```

`src/components/ProjectGrid.tsx`:

```tsx
import type { Project } from '@/payload-types'
import { ProjectCard } from './ProjectCard'
import styles from './project.module.css'

export function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p>No projects published yet.</p>
  }
  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Build the rich-text renderer**

`src/components/RichText.tsx`:

```tsx
import {
  RichText as LexicalRichText,
  type SerializedEditorState,
} from '@payloadcms/richtext-lexical/react'

export function RichText({ data }: { data: SerializedEditorState | null | undefined }) {
  if (!data) return null
  return <LexicalRichText data={data} />
}
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm run test:unit
```

Expected: PASS, 36 tests total. If `toHaveAttribute` is unavailable, add `import '@testing-library/jest-dom/vitest'` to `vitest.setup.ts` and `@testing-library/jest-dom` to devDependencies.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add UI primitives, project card, and rich text renderer"
```

---

### Task 10: Home page

**Files:**
- Create: `src/components/Hero.tsx`, `src/components/hero.module.css`
- Create: `src/lib/queries.ts`
- Modify: `src/app/(frontend)/page.tsx`
- Create: `tests/e2e/home.e2e.spec.ts`

**Interfaces:**
- Consumes: `ProjectGrid` (Task 9), globals (Task 7), seeded content (Task 8)
- Produces: `getSiteSettings()`, `getFeaturedProjects()`, `getExperience()` in `src/lib/queries.ts`; a homepage with hero, three featured projects, and a condensed timeline

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/home.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('hero shows the headline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'I build and run the systems software depends on.',
  )
})

test('featured projects appear with links to detail pages', async ({ page }) => {
  await page.goto('/')
  const featured = page.getByRole('region', { name: 'Selected work' })
  await expect(featured.getByRole('link', { name: 'Portside Pottery' })).toHaveAttribute(
    'href',
    '/projects/portside-pottery',
  )
  await expect(featured.getByRole('article')).toHaveCount(3)
})

test('condensed timeline lists the current role', async ({ page }) => {
  await page.goto('/')
  const timeline = page.getByRole('region', { name: 'Experience' })
  await expect(timeline).toContainText('PRE Security')
  await expect(timeline).toContainText('Present')
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:e2e
```

Expected: FAIL — the placeholder homepage has none of this.

- [ ] **Step 3: Write the shared queries**

`src/lib/queries.ts`:

```ts
import config from '@payload-config'
import { getPayload } from 'payload'
import type { Education, Experience, Project } from '@/payload-types'

export async function client() {
  return getPayload({ config })
}

export async function getSiteSettings() {
  const payload = await client()
  return payload.findGlobal({ slug: 'site-settings', depth: 1 })
}

export async function getAbout() {
  const payload = await client()
  return payload.findGlobal({ slug: 'about', depth: 1 })
}

export async function getSkills() {
  const payload = await client()
  return payload.findGlobal({ slug: 'skills', depth: 0 })
}

export async function getProjects(options?: { featured?: boolean; limit?: number }) {
  const payload = await client()
  const result = await payload.find({
    collection: 'projects',
    depth: 1,
    limit: options?.limit ?? 100,
    sort: 'order',
    where: {
      and: [
        { _status: { equals: 'published' } },
        ...(options?.featured ? [{ featured: { equals: true } }] : []),
      ],
    },
  })
  return result.docs as Project[]
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const payload = await client()
  const result = await payload.find({
    collection: 'projects',
    depth: 2,
    limit: 1,
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
  })
  return (result.docs[0] as Project | undefined) ?? null
}

export async function getExperience(): Promise<Experience[]> {
  const payload = await client()
  const result = await payload.find({ collection: 'experience', sort: 'order', limit: 100 })
  return result.docs as Experience[]
}

export async function getEducation(): Promise<Education[]> {
  const payload = await client()
  const result = await payload.find({ collection: 'education', sort: 'order', limit: 100 })
  return result.docs as Education[]
}
```

- [ ] **Step 4: Build the Hero**

`src/components/hero.module.css`:

```css
.hero {
  display: flex;
  gap: var(--space-12);
  align-items: center;
  padding: var(--space-16) 0 var(--space-12);
}

.copy { flex: 1; min-width: 0; }

.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
}

.lede {
  font-size: 1.0625rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-6);
}

.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }

.portrait {
  width: 200px;
  height: 200px;
  border-radius: 20px;
  object-fit: cover;
  flex: none;
  border: 1px solid var(--color-border);
}

@media (max-width: 760px) {
  .hero { flex-direction: column-reverse; align-items: flex-start; gap: var(--space-6); padding-top: var(--space-8); }
  .portrait { width: 128px; height: 128px; }
}
```

`src/components/Hero.tsx`:

```tsx
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
```

- [ ] **Step 5: Build the condensed timeline**

`src/components/ExperienceTimeline.tsx`:

```tsx
import type { Experience } from '@/payload-types'
import { formatDateRange } from '@/lib/format'
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
            {formatDateRange(item.startDate, item.endDate, Boolean(item.current))}
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
```

`src/components/timeline.module.css`:

```css
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-8); }

.item { display: flex; gap: var(--space-6); }

.dates {
  flex: none;
  width: 160px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding-top: 3px;
}

.detail { min-width: 0; }
.role { margin: 0 0 var(--space-1); font-size: 1.0625rem; }
.company { color: var(--color-text-muted); font-size: 0.9375rem; }

.bullets {
  margin: var(--space-3) 0 0;
  padding-left: var(--space-4);
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

@media (max-width: 720px) {
  .item { flex-direction: column; gap: var(--space-2); }
  .dates { width: auto; }
}
```

- [ ] **Step 6: Build the home page**

Replace `src/app/(frontend)/page.tsx`:

```tsx
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { Hero } from '@/components/Hero'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getAbout, getExperience, getProjects, getSiteSettings } from '@/lib/queries'
import type { Media } from '@/payload-types'

export default async function HomePage() {
  const [settings, about, featured, experience] = await Promise.all([
    getSiteSettings(),
    getAbout(),
    getProjects({ featured: true, limit: 3 }),
    getExperience(),
  ])

  const portrait =
    about.portrait && typeof about.portrait === 'object' ? (about.portrait as Media) : null
  const resume =
    settings.resumePdf && typeof settings.resumePdf === 'object'
      ? (settings.resumePdf as Media)
      : null

  return (
    <Container>
      <Hero
        headline={settings.heroHeadline || settings.name}
        tagline={settings.tagline}
        status={settings.availabilityStatus}
        portrait={portrait}
        resumeUrl={resume?.url}
      />
      <Section title="Selected work" id="work">
        <ProjectGrid projects={featured} />
      </Section>
      <Section title="Experience" id="experience">
        <ExperienceTimeline items={experience} />
      </Section>
    </Container>
  )
}
```

`<Section>` already sets `aria-labelledby` (Task 3), which is what makes `getByRole('region', { name: 'Selected work' })` resolve. The `id` prop is required for that — every `<Section>` used in an e2e assertion must pass one.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm run seed && npm run test:e2e
```

Expected: PASS, 6 e2e tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build homepage with hero, featured projects, and experience timeline"
```

---

### Task 11: Projects index and detail pages

**Files:**
- Create: `src/app/(frontend)/projects/page.tsx`, `src/app/(frontend)/projects/[slug]/page.tsx`
- Create: `src/components/projectDetail.module.css`
- Create: `tests/e2e/projects.e2e.spec.ts`

**Interfaces:**
- Consumes: `getProjects`, `getProjectBySlug` (Task 10); `ProjectGrid`, `RichText`, `Tag`, `Button` (Task 9)
- Produces: `/projects` and `/projects/[slug]`, both statically generated

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/projects.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('index lists all published projects', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.getByRole('article')).toHaveCount(4)
})

test('detail page shows metadata and live link', async ({ page }) => {
  await page.goto('/projects/portside-pottery')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portside Pottery')
  await expect(page.getByText('Next.js')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Visit site' })).toHaveAttribute(
    'href',
    'https://portsidepottery.com',
  )
})

test('unknown slug returns 404', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist')
  expect(response?.status()).toBe(404)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:e2e
```

Expected: FAIL — `/projects` 404s.

- [ ] **Step 3: Build the index page**

`src/app/(frontend)/projects/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getProjects } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Projects built and shipped by Brian Wells.',
}

export default async function ProjectsPage() {
  const projects = await getProjects()
  return (
    <Container>
      <Section title="Work" id="work">
        <ProjectGrid projects={projects} />
      </Section>
    </Container>
  )
}
```

- [ ] **Step 4: Build the detail page**

`src/components/projectDetail.module.css`:

```css
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: var(--space-12); }

.meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  font-size: 0.9375rem;
  align-self: start;
  position: sticky;
  top: 88px;
}

.metaLabel {
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.links { display: flex; flex-direction: column; gap: var(--space-2); align-items: flex-start; }

.cover {
  width: 100%;
  border-radius: var(--radius-card);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-8);
  object-fit: cover;
}

.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); margin-top: var(--space-8); }
.gallery img { border-radius: var(--radius-thumb); border: 1px solid var(--color-border); width: 100%; }

@media (max-width: 860px) {
  .layout { grid-template-columns: 1fr; gap: var(--space-8); }
  .meta { position: static; }
}
```

`src/app/(frontend)/projects/[slug]/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Tag } from '@/components/ui/Tag'
import { getProjectBySlug, getProjects } from '@/lib/queries'
import type { Media } from '@/payload-types'
import styles from '@/components/projectDetail.module.css'

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const projects = await getProjects()
  return projects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Not found' }
  return { title: project.title, description: project.summary }
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const cover =
    project.coverImage && typeof project.coverImage === 'object'
      ? (project.coverImage as Media)
      : null
  const gallery = (project.gallery ?? []).filter(
    (item): item is Media => typeof item === 'object' && item !== null,
  )
  const tags = (project.techStack ?? []).filter((t) => Boolean(t.name))

  return (
    <Container>
      <div style={{ paddingTop: 'var(--space-12)' }}>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
      </div>

      {cover?.url ? (
        <Image
          className={styles.cover}
          src={cover.url}
          alt={cover.alt}
          width={1600}
          height={900}
          priority
        />
      ) : null}

      <div className={styles.layout}>
        <div>
          <RichText data={project.body} />
          {gallery.length > 0 ? (
            <div className={styles.gallery}>
              {gallery.map((image) =>
                image.url ? (
                  <Image
                    key={image.id}
                    src={image.url}
                    alt={image.alt}
                    width={768}
                    height={512}
                  />
                ) : null,
              )}
            </div>
          ) : null}
        </div>

        <aside className={styles.meta}>
          {project.role ? (
            <div>
              <div className={styles.metaLabel}>Role</div>
              {project.role}
            </div>
          ) : null}
          {project.timeframe ? (
            <div>
              <div className={styles.metaLabel}>Timeframe</div>
              {project.timeframe}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div>
              <div className={styles.metaLabel}>Stack</div>
              <div className={styles.tags}>
                {tags.map((tag) => (
                  <Tag key={tag.id ?? tag.name}>{tag.name}</Tag>
                ))}
              </div>
            </div>
          ) : null}
          {project.liveUrl || project.repoUrl ? (
            <div className={styles.links}>
              {project.liveUrl ? (
                <Button href={project.liveUrl}>Visit site</Button>
              ) : null}
              {project.repoUrl ? (
                <Button href={project.repoUrl} variant="ghost">
                  View source
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  )
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm run test:e2e
```

Expected: PASS, 9 e2e tests.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add projects index and detail pages"
```

---

### Task 12: Experience and About pages

**Files:**
- Create: `src/app/(frontend)/experience/page.tsx`, `src/app/(frontend)/about/page.tsx`
- Create: `src/components/SkillGroups.tsx`, `src/components/skills.module.css`
- Create: `tests/e2e/experience.e2e.spec.ts`

**Interfaces:**
- Consumes: `getExperience`, `getEducation`, `getSkills`, `getAbout`, `getSiteSettings` (Task 10); `ExperienceTimeline` (Task 10)
- Produces: `/experience` and `/about`; `<SkillGroups groups>`

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/experience.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('experience page shows roles with bullets', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByText('Full Stack Founding Engineer (Early Team)')).toBeVisible()
  await expect(
    page.getByText('Architected a Kubernetes-based platform', { exact: false }),
  ).toBeVisible()
})

test('experience page lists education and skills', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByText('Master of Science in Computer Science')).toBeVisible()
  await expect(page.getByText('Infrastructure & Cloud')).toBeVisible()
  await expect(page.getByText('Kubernetes')).toBeVisible()
})

test('resume download is absent when no resume is uploaded', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByRole('link', { name: 'Download resume' })).toHaveCount(0)
})

test('about page renders', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:e2e
```

Expected: FAIL — `/experience` 404s.

- [ ] **Step 3: Build SkillGroups**

`src/components/skills.module.css`:

```css
.groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-6); }
.group h3 { font-size: 0.6875rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-text-muted); margin-bottom: var(--space-3); }
.items { display: flex; flex-wrap: wrap; gap: var(--space-2); }
```

`src/components/SkillGroups.tsx`:

```tsx
import { Tag } from './ui/Tag'
import styles from './skills.module.css'

export type SkillGroup = {
  id?: string | null
  category: string
  items?: { id?: string | null; name: string }[] | null
}

export function SkillGroups({ groups }: { groups: SkillGroup[] }) {
  if (groups.length === 0) return null
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <div key={group.id ?? group.category} className={styles.group}>
          <h3>{group.category}</h3>
          <div className={styles.items}>
            {(group.items ?? []).map((item) => (
              <Tag key={item.id ?? item.name}>{item.name}</Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build the experience page**

`src/app/(frontend)/experience/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { SkillGroups } from '@/components/SkillGroups'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { formatMonthYear } from '@/lib/format'
import { getEducation, getExperience, getSiteSettings, getSkills } from '@/lib/queries'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Career history, education, and technical skills.',
}

export default async function ExperiencePage() {
  const [experience, education, skills, settings] = await Promise.all([
    getExperience(),
    getEducation(),
    getSkills(),
    getSiteSettings(),
  ])

  const resume =
    settings.resumePdf && typeof settings.resumePdf === 'object'
      ? (settings.resumePdf as Media)
      : null

  return (
    <Container>
      <Section title="Experience" id="experience">
        <ExperienceTimeline items={experience} detailed />
      </Section>

      <Section title="Education" id="education">
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {education.map((item) => (
            <li key={item.id} style={{ marginBottom: 'var(--space-4)' }}>
              <strong>{item.degree}</strong>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                {item.school} · {formatMonthYear(item.date)}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Skills" id="skills">
        <SkillGroups groups={skills.groups ?? []} />
      </Section>

      {resume?.url ? (
        <Section>
          <Button href={resume.url}>Download resume</Button>
        </Section>
      ) : null}
    </Container>
  )
}
```

- [ ] **Step 5: Build the about page**

`src/app/(frontend)/about/page.tsx`:

```tsx
import type { Metadata } from 'next'
import Image from 'next/image'
import { RichText } from '@/components/RichText'
import { Container } from '@/components/ui/Container'
import { getAbout } from '@/lib/queries'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'About',
  description: 'A bit about Brian Wells.',
}

export default async function AboutPage() {
  const about = await getAbout()
  const portrait =
    about.portrait && typeof about.portrait === 'object' ? (about.portrait as Media) : null

  return (
    <Container>
      <div style={{ padding: 'var(--space-12) 0' }}>
        <h1>About</h1>
        {portrait?.url ? (
          <Image
            src={portrait.url}
            alt={portrait.alt}
            width={400}
            height={400}
            style={{
              width: 200,
              height: 200,
              objectFit: 'cover',
              borderRadius: 20,
              border: '1px solid var(--color-border)',
              marginBottom: 'var(--space-6)',
            }}
          />
        ) : null}
        <RichText data={about.body} />
      </div>
    </Container>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:e2e
```

Expected: PASS, 13 e2e tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add experience and about pages"
```

---

### Task 13: Contact form core logic

**Files:**
- Create: `src/lib/contact-schema.ts`, `src/lib/ip-hash.ts`, `src/lib/turnstile.ts`, `src/lib/rate-limit.ts`
- Create: `src/collections/ContactSubmissions.ts`
- Create: `tests/unit/contact-schema.test.ts`, `tests/unit/ip-hash.test.ts`, `tests/unit/turnstile.test.ts`
- Create: `tests/int/rate-limit.int.spec.ts`
- Modify: `src/payload.config.ts`

**Interfaces:**
- Consumes: Payload config from Task 1
- Produces: `contactSchema` and `ContactInput`; `fieldErrors(error): Record<string, string>`; `hashIp(ip, salt): string`; `verifyTurnstile(token, secret, remoteIp?): Promise<boolean>`; `isRateLimited(payload, ipHash, now?): Promise<boolean>`; `RATE_LIMIT_MAX = 3`; `RATE_LIMIT_WINDOW_MS`; the `contact-submissions` collection

- [ ] **Step 1: Write the failing validation test**

`tests/unit/contact-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { contactSchema, fieldErrors } from '@/lib/contact-schema'

const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'I would like to talk about a role on our infrastructure team.',
  turnstileToken: 'token-abc',
}

describe('contactSchema', () => {
  it('accepts a well-formed submission', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('trims surrounding whitespace from the name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '  Ada  ' })
    expect(result.success && result.data.name).toBe('Ada')
  })

  it('rejects an empty name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed email', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('rejects a message under 10 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'hi' })
    expect(result.success).toBe(false)
  })

  it('rejects a message over 5000 characters', () => {
    const result = contactSchema.safeParse({ ...valid, message: 'a'.repeat(5001) })
    expect(result.success).toBe(false)
  })

  it('rejects a missing turnstile token', () => {
    const result = contactSchema.safeParse({ ...valid, turnstileToken: '' })
    expect(result.success).toBe(false)
  })
})

describe('fieldErrors', () => {
  it('maps the first issue per field to a message', () => {
    const result = contactSchema.safeParse({ ...valid, name: '', email: 'nope' })
    expect(result.success).toBe(false)
    if (result.success) return
    const errors = fieldErrors(result.error)
    expect(errors.name).toBe('Name is required')
    expect(errors.email).toBe('Enter a valid email address')
  })
})
```

- [ ] **Step 2: Write the failing hash test**

`tests/unit/ip-hash.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hashIp } from '@/lib/ip-hash'

describe('hashIp', () => {
  it('produces a 64-character hex digest', () => {
    expect(hashIp('203.0.113.5', 'salt')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable for the same input', () => {
    expect(hashIp('203.0.113.5', 'salt')).toBe(hashIp('203.0.113.5', 'salt'))
  })

  it('differs for different IPs', () => {
    expect(hashIp('203.0.113.5', 'salt')).not.toBe(hashIp('203.0.113.6', 'salt'))
  })

  it('differs for different salts', () => {
    expect(hashIp('203.0.113.5', 'salt-a')).not.toBe(hashIp('203.0.113.5', 'salt-b'))
  })

  it('never contains the raw IP', () => {
    expect(hashIp('203.0.113.5', 'salt')).not.toContain('203.0.113.5')
  })

  it('throws when the salt is empty', () => {
    expect(() => hashIp('203.0.113.5', '')).toThrow('IP_HASH_SALT')
  })
})
```

- [ ] **Step 3: Write the failing Turnstile test**

`tests/unit/turnstile.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstile } from '@/lib/turnstile'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(impl: (url: string, init: RequestInit) => Response) {
  const spy = vi.fn(async (url: string, init: RequestInit) => impl(url, init))
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('verifyTurnstile', () => {
  it('returns true when Cloudflare reports success', async () => {
    stubFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(true)
  })

  it('returns false when Cloudflare reports failure', async () => {
    stubFetch(() => new Response(JSON.stringify({ success: false }), { status: 200 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('returns false on a non-200 response', async () => {
    stubFetch(() => new Response('', { status: 500 }))
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('returns false when fetch throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      }),
    )
    await expect(verifyTurnstile('tok', 'secret')).resolves.toBe(false)
  })

  it('posts the secret, token, and remote IP', async () => {
    const spy = stubFetch(() => new Response(JSON.stringify({ success: true }), { status: 200 }))
    await verifyTurnstile('tok', 'secret', '203.0.113.5')
    const body = spy.mock.calls[0][1].body as URLSearchParams
    expect(body.get('secret')).toBe('secret')
    expect(body.get('response')).toBe('tok')
    expect(body.get('remoteip')).toBe('203.0.113.5')
  })
})
```

- [ ] **Step 4: Run the tests to verify they fail**

```bash
npm run test:unit
```

Expected: FAIL — three unresolved modules.

- [ ] **Step 5: Implement the three pure modules**

`src/lib/contact-schema.ts`:

```ts
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter a valid email address')
    .max(254, 'Email must be 254 characters or fewer')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'),
  message: z
    .string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must be 5000 characters or fewer'),
  turnstileToken: z.string().min(1, 'Verification failed. Please try again.'),
})

export type ContactInput = z.infer<typeof contactSchema>

/** Maps the first issue per field to its message. Uses `issues`, stable across Zod majors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
```

An explicit regex is used rather than `z.email()` so the error message and the trimming order stay under our control and do not shift between Zod minor versions.

`src/lib/ip-hash.ts`:

```ts
import { createHash } from 'node:crypto'

export function hashIp(ip: string, salt: string): string {
  if (!salt) throw new Error('IP_HASH_SALT is not set')
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex')
}
```

`src/lib/turnstile.ts`:

```ts
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<boolean> {
  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const response = await fetch(VERIFY_URL, { method: 'POST', body })
    if (!response.ok) return false
    const data = (await response.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
```

- [ ] **Step 6: Run the unit tests to verify they pass**

```bash
npm run test:unit
```

Expected: PASS, 55 tests total (36 prior + 8 schema + 6 hash + 5 Turnstile).

- [ ] **Step 7: Write the failing rate-limit integration test**

`tests/int/rate-limit.int.spec.ts`:

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { RATE_LIMIT_MAX, isRateLimited } from '@/lib/rate-limit'

let payload: Payload
const ipHash = 'a'.repeat(64)

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(async () => {
  await payload.delete({
    collection: 'contact-submissions',
    where: { ipHash: { equals: ipHash } },
  })
})

async function submit(submittedAt: Date) {
  await payload.create({
    collection: 'contact-submissions',
    data: {
      name: 'Test',
      email: 'test@example.com',
      message: 'A message long enough to pass validation.',
      ipHash,
      submittedAt: submittedAt.toISOString(),
    },
  })
}

describe('isRateLimited', () => {
  const now = new Date('2026-08-11T12:00:00.000Z')

  it('allows the first submission', async () => {
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it(`allows up to ${RATE_LIMIT_MAX - 1} prior submissions in the window`, async () => {
    await submit(new Date('2026-08-11T11:50:00.000Z'))
    await submit(new Date('2026-08-11T11:55:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it(`blocks once ${RATE_LIMIT_MAX} submissions are in the window`, async () => {
    await submit(new Date('2026-08-11T11:30:00.000Z'))
    await submit(new Date('2026-08-11T11:40:00.000Z'))
    await submit(new Date('2026-08-11T11:50:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(true)
  })

  it('ignores submissions older than the window', async () => {
    await submit(new Date('2026-08-11T10:00:00.000Z'))
    await submit(new Date('2026-08-11T10:10:00.000Z'))
    await submit(new Date('2026-08-11T10:20:00.000Z'))
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })

  it('does not count another IP toward this one', async () => {
    await payload.create({
      collection: 'contact-submissions',
      data: {
        name: 'Other',
        email: 'other@example.com',
        message: 'A message long enough to pass validation.',
        ipHash: 'b'.repeat(64),
        submittedAt: new Date('2026-08-11T11:50:00.000Z').toISOString(),
      },
    })
    await expect(isRateLimited(payload, ipHash, now)).resolves.toBe(false)
  })
})
```

- [ ] **Step 8: Implement the collection and the rate limiter**

`src/collections/ContactSubmissions.ts`:

```ts
import type { CollectionConfig } from 'payload'

export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: { singular: 'Contact Submission', plural: 'Contact Submissions' },
  access: {
    // Written only by the server action, which uses local API (bypasses access control).
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'submittedAt'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
    },
    {
      name: 'ipHash',
      type: 'text',
      index: true,
      admin: {
        hidden: true,
        description: 'Salted SHA-256 of the submitter IP. Used only for rate limiting.',
      },
    },
  ],
}
```

`src/lib/rate-limit.ts`:

```ts
import type { Payload } from 'payload'

export const RATE_LIMIT_MAX = 3
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

export async function isRateLimited(
  payload: Payload,
  ipHash: string,
  now: Date = new Date(),
): Promise<boolean> {
  const since = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { totalDocs } = await payload.count({
    collection: 'contact-submissions',
    where: {
      and: [{ ipHash: { equals: ipHash } }, { submittedAt: { greater_than: since } }],
    },
  })
  return totalDocs >= RATE_LIMIT_MAX
}
```

- [ ] **Step 9: Register the collection**

In `src/payload.config.ts`, import `ContactSubmissions` and set
`collections: [Users, Media, Projects, Experience, Education, ContactSubmissions]`.

- [ ] **Step 10: Run the integration tests to verify they pass**

```bash
npm run generate:types && npm run test:int
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add contact validation, salted IP hashing, Turnstile, and rate limiting"
```

---

### Task 14: Contact form UI and delivery

**Files:**
- Create: `src/actions/submit-contact.ts`, `src/components/ContactForm.tsx`, `src/components/contact.module.css`
- Create: `src/app/(frontend)/contact/page.tsx`
- Create: `tests/e2e/contact.e2e.spec.ts`

**Interfaces:**
- Consumes: everything from Task 13
- Produces: `submitContact(prevState, formData): Promise<ContactState>` where `ContactState = { status: 'idle' | 'success' | 'error'; errors?: Record<string, string> }`

- [ ] **Step 1: Write the failing e2e test**

Turnstile is not rendered when `TURNSTILE_SITE_KEY` is unset, so client-side validation is what the e2e test exercises.

`tests/e2e/contact.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('contact page renders the form', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Message')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('server rejects an invalid submission with field errors', async ({ page }) => {
  await page.goto('/contact')
  // Bypass native browser validation so the request reaches the server action.
  await page.locator('form').evaluate((form) => form.setAttribute('novalidate', 'novalidate'))
  await page.getByLabel('Name').fill('')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Message').fill('short')
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(page.getByText('Name is required')).toBeVisible()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  await expect(page.getByText('Message must be at least 10 characters')).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:e2e
```

Expected: FAIL — `/contact` 404s.

- [ ] **Step 3: Implement the server action**

The submission is persisted *before* the email is sent, so a Resend outage never loses a message.

`src/actions/submit-contact.ts`:

```ts
'use server'

import { headers } from 'next/headers'
import config from '@payload-config'
import { getPayload } from 'payload'
import { Resend } from 'resend'
import { contactSchema, fieldErrors } from '@/lib/contact-schema'
import { hashIp } from '@/lib/ip-hash'
import { isRateLimited } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'

export type ContactState = {
  status: 'idle' | 'success' | 'error'
  errors?: Record<string, string>
}

async function clientIp(): Promise<string> {
  const h = await headers()
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
    // When Turnstile is not configured (local dev), accept a placeholder token.
    turnstileToken: formData.get('cf-turnstile-response') ?? 'dev',
  })

  if (!parsed.success) {
    return { status: 'error', errors: fieldErrors(parsed.error) }
  }

  const ip = await clientIp()
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (secret) {
    const human = await verifyTurnstile(parsed.data.turnstileToken, secret, ip)
    if (!human) {
      return { status: 'error', errors: { _form: 'Verification failed. Please try again.' } }
    }
  }

  const payload = await getPayload({ config })
  const salt = process.env.IP_HASH_SALT
  if (!salt) {
    payload.logger.error('IP_HASH_SALT is not set; refusing to accept submissions.')
    return { status: 'error', errors: { _form: 'Something went wrong. Please email instead.' } }
  }
  const ipHash = hashIp(ip, salt)

  if (await isRateLimited(payload, ipHash)) {
    return {
      status: 'error',
      errors: { _form: 'Too many messages from this network. Please try again later.' },
    }
  }

  await payload.create({
    collection: 'contact-submissions',
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      ipHash,
      submittedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL

  if (apiKey && to && from) {
    try {
      const resend = new Resend(apiKey)
      await resend.emails.send({
        from,
        to,
        replyTo: parsed.data.email,
        subject: `brianwells.org — message from ${parsed.data.name}`,
        text: `${parsed.data.name} <${parsed.data.email}>\n\n${parsed.data.message}`,
      })
    } catch (error) {
      // The submission is already durable; a delivery failure must not fail the request.
      payload.logger.error({ err: error }, 'Resend delivery failed')
    }
  }

  return { status: 'success' }
}
```

- [ ] **Step 4: Build the form**

`src/components/contact.module.css`:

```css
.form { display: flex; flex-direction: column; gap: var(--space-4); max-width: 560px; }
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.field label { font-size: 0.875rem; font-weight: 600; }

.field input,
.field textarea {
  font: inherit;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 10px 12px;
}

.field input:focus,
.field textarea:focus { border-color: var(--color-accent); outline: none; }

.field textarea { min-height: 160px; resize: vertical; }

.error { color: var(--color-error); font-size: 0.8125rem; }
.success { color: var(--color-accent); font-weight: 600; }

.submit {
  align-self: flex-start;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}

.submit:disabled { opacity: 0.6; cursor: progress; }
```

Error text uses `var(--color-error)`, which swaps automatically with the theme and is covered by the Task 2 contrast test — no literal colors, no dark-mode override needed here.

`src/components/ContactForm.tsx`:

```tsx
'use client'

import Script from 'next/script'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitContact, type ContactState } from '@/actions/submit-contact'
import styles from './contact.module.css'

const initialState: ContactState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button className={styles.submit} type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send message'}
    </button>
  )
}

export function ContactForm({ siteKey }: { siteKey?: string }) {
  const [state, formAction] = useActionState(submitContact, initialState)

  if (state.status === 'success') {
    return <p className={styles.success}>Thanks — your message is on its way.</p>
  }

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      ) : null}
      <form className={styles.form} action={formAction}>
        {state.errors?._form ? <p className={styles.error}>{state.errors._form}</p> : null}

        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required maxLength={100} />
          {state.errors?.name ? <span className={styles.error}>{state.errors.name}</span> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required maxLength={254} />
          {state.errors?.email ? <span className={styles.error}>{state.errors.email}</span> : null}
        </div>

        <div className={styles.field}>
          <label htmlFor="message">Message</label>
          <textarea id="message" name="message" required minLength={10} maxLength={5000} />
          {state.errors?.message ? (
            <span className={styles.error}>{state.errors.message}</span>
          ) : null}
        </div>

        {siteKey ? <div className="cf-turnstile" data-sitekey={siteKey} /> : null}

        <SubmitButton />
      </form>
    </>
  )
}
```

- [ ] **Step 5: Build the contact page**

`src/app/(frontend)/contact/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { ContactForm } from '@/components/ContactForm'
import { Container } from '@/components/ui/Container'
import { getSiteSettings } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Brian Wells.',
}

export default async function ContactPage() {
  const settings = await getSiteSettings()
  const email = settings.publicEmail?.trim()

  return (
    <Container>
      <div style={{ padding: 'var(--space-12) 0' }}>
        <h1>Contact</h1>
        <p>
          Send a message and it will reach my inbox.
          {email ? (
            <>
              {' '}
              You can also email me directly at <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : null}
        </p>
        <ContactForm siteKey={process.env.TURNSTILE_SITE_KEY} />
      </div>
    </Container>
  )
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm run test:e2e
```

Expected: PASS, 15 e2e tests.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add contact form with Turnstile, rate limiting, and Resend delivery

Submissions are persisted before sending so a Resend outage never loses a message."
```

---

### Task 15: SEO, sitemap, and Open Graph

**Files:**
- Create: `src/app/(frontend)/sitemap.ts`, `src/app/(frontend)/robots.ts`
- Create: `src/app/(frontend)/opengraph-image.tsx`, `src/app/(frontend)/projects/[slug]/opengraph-image.tsx`
- Modify: `src/app/(frontend)/layout.tsx`
- Create: `tests/e2e/seo.e2e.spec.ts`

**Interfaces:**
- Consumes: `getProjects`, `getProjectBySlug`, `getSiteSettings` (Task 10)
- Produces: `/sitemap.xml`, `/robots.txt`, root metadata with a title template, and a generated PNG Open Graph image per project

- [ ] **Step 1: Write the failing e2e test**

`tests/e2e/seo.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test('sitemap lists the static pages and every project', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('/projects')
  expect(xml).toContain('/experience')
  expect(xml).toContain('/projects/portside-pottery')
})

test('robots.txt disallows the admin panel', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const text = await response.text()
  expect(text).toContain('Disallow: /admin')
})

test('pages carry a templated title and description', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveTitle('Work · Brian Wells')
  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute('content', /Projects built and shipped/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:e2e
```

Expected: FAIL — `/sitemap.xml` 404s.

- [ ] **Step 3: Implement sitemap and robots**

`src/app/(frontend)/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next'
import { getProjects } from '@/lib/queries'

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getProjects()

  const staticRoutes = ['', '/projects', '/experience', '/about', '/contact'].map((route) => ({
    url: `${BASE}${route}`,
    changeFrequency: 'monthly' as const,
    priority: route === '' ? 1 : 0.7,
  }))

  const projectRoutes = projects.map((project) => ({
    url: `${BASE}/projects/${project.slug}`,
    lastModified: new Date(project.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...projectRoutes]
}
```

`src/app/(frontend)/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api'] }],
    sitemap: `${BASE}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Add root metadata**

In `src/app/(frontend)/layout.tsx`, add above the component:

```tsx
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  const name = settings.name || 'Brian Wells'
  const title = settings.defaultSeo?.title || name
  const description =
    settings.defaultSeo?.description || settings.tagline || 'Software and infrastructure engineer.'

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'https://brianwells.org'),
    title: { default: title, template: `%s · ${name}` },
    description,
    openGraph: { title, description, type: 'website', siteName: name },
    twitter: { card: 'summary_large_image', title, description },
  }
}
```

Next merges each page's `metadata.title` into the template, producing `Work · Brian Wells`.

- [ ] **Step 5: Add the failing OG image test**

Append to `tests/e2e/seo.e2e.spec.ts`:

```ts
test('each project exposes a generated Open Graph image', async ({ page, request }) => {
  await page.goto('/projects/portside-pottery')
  const ogImage = page.locator('meta[property="og:image"]')
  const url = await ogImage.getAttribute('content')
  expect(url).toBeTruthy()

  const response = await request.get(url as string)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
})
```

Run `npm run test:e2e`. Expected: FAIL — no `og:image` meta tag.

- [ ] **Step 6: Implement dynamic OG images**

Next's file convention generates the route and injects the meta tag automatically, which
is simpler and less error-prone than the hand-rolled `/og/[...]` route the spec sketched.

`src/app/(frontend)/projects/[slug]/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'
import { getProjectBySlug } from '@/lib/queries'

export const alt = 'Project — Brian Wells'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#131211',
          color: '#f0ede9',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, color: '#2dd4bf' }}>brianwells.org</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {project?.title ?? 'Project'}
          </div>
          <div style={{ fontSize: 30, color: '#a8a19a', maxWidth: 900 }}>
            {project?.summary ?? ''}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#a8a19a' }}>Brian Wells</div>
      </div>
    ),
    size,
  )
}
```

Colors are inlined because `ImageResponse` renders in an isolated Satori context with no
access to the site's CSS custom properties. They are copied from the dark-theme tokens.

Add a site-wide fallback at `src/app/(frontend)/opengraph-image.tsx` using the same
layout, with the heading set to `Brian Wells` and the subtitle to
`Software & infrastructure engineer` — no data fetching, no `params`.

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm run test:e2e
```

Expected: PASS, 19 e2e tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add sitemap, robots, templated metadata, and generated OG images"
```

---

### Task 16: Container

**Files:**
- Modify: `Dockerfile`, `next.config.ts`
- Replace: `docker-compose.yml`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: the whole app
- Produces: a runnable image exposing port 3000 with a healthcheck against `/api/health`

- [ ] **Step 1: Enable standalone output**

In `next.config.ts`, add `output: 'standalone',` as the first key of `nextConfig`. Without it the Dockerfile's `.next/standalone` copy fails.

- [ ] **Step 2: Write `.dockerignore`**

```
node_modules
.next
.git
.github
.env
.env.*
!.env.example
docs
tests
playwright-report
test-results
.superpowers
README.md
```

- [ ] **Step 3: Update the Dockerfile**

Replace `Dockerfile`. Changes from the template: Node 24, npm-only (no yarn/pnpm branching), and a healthcheck.

```dockerfile
FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# A dummy secret satisfies buildConfig at build time; the real one is injected at runtime.
ENV PAYLOAD_SECRET=build-time-placeholder
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
```

- [ ] **Step 4: Write the compose file for unraid**

Replace `docker-compose.yml`. No Postgres service — the existing server instance is used.

```yaml
services:
  web:
    image: ghcr.io/briswells/brianwells-org:latest
    container_name: brianwells-org
    restart: unless-stopped
    env_file: .env
    ports:
      - '3000:3000'
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
```

- [ ] **Step 5: Build and run the image locally**

```bash
docker build -t brianwells-org:local .
docker run --rm -p 3000:3000 --env-file .env \
  -e DATABASE_URI="postgres://postgres:postgres@host.docker.internal:5433/brianwells_dev" \
  brianwells-org:local
```

In a second terminal:

```bash
curl -fsS http://localhost:3000/api/health
```

Expected: `{"status":"ok"}`. Then stop the container.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: containerize on node 24 with standalone output and healthcheck"
```

---

### Task 17: CI pipeline and deployment runbook

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `docs/DEPLOYMENT.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: all previous tasks
- Produces: a pipeline that lints, typechecks, tests against a real Postgres, and publishes `ghcr.io/briswells/brianwells-org:{sha,latest}`

- [ ] **Step 1: Write the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '24'

jobs:
  verify:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: brianwells_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URI: postgres://postgres:postgres@localhost:5432/brianwells_test
      PAYLOAD_SECRET: ci-secret-not-used-in-production
      IP_HASH_SALT: ci-salt-not-used-in-production
      NEXT_PUBLIC_SERVER_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npm run generate:types

      - run: npm run typecheck

      - run: npm run test:unit

      - run: npm run test:int

      - run: npm run seed

      - run: npx playwright install --with-deps chromium

      - run: npm run test:e2e

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  publish:
    needs: verify
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/briswells/brianwells-org:${{ github.sha }}
            ghcr.io/briswells/brianwells-org:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Verify the workflow parses**

```bash
npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo "workflow YAML OK"
```

Expected: `workflow YAML OK`.

- [ ] **Step 3: Write the deployment runbook**

`docs/DEPLOYMENT.md`:

````markdown
# Deploying brianwells.org

## One-time Cloudflare setup

### 1. R2 bucket

1. Cloudflare dashboard → R2 → **Create bucket**, name it `brianwells-media`.
2. Bucket → Settings → **Public access** → connect the custom domain `media.brianwells.org`.
   R2 buckets are private by default; the S3 API endpoint uploads but cannot serve.
3. R2 → **Manage API tokens** → create a token with Object Read & Write scoped to the bucket.
4. Record `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and the endpoint
   `https://<accountId>.r2.cloudflarestorage.com`.

### 2. Tunnel

1. Zero Trust → Networks → Tunnels → **Create a tunnel** (Cloudflared), name it `unraid`.
2. Install the connector on unraid — either the Cloudflared community app or:
   ```bash
   docker run -d --name cloudflared --restart unless-stopped \
     cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
   ```
3. Add a public hostname: `brianwells.org` → `HTTP` → `http://<unraid-lan-ip>:3000`.
4. Add `www.brianwells.org` the same way if you want the alias.

No port forwarding and no dynamic DNS: the tunnel dials out, so a changing home IP is
irrelevant.

### 3. Cloudflare Access on the admin panel

1. Zero Trust → Access → Applications → **Add a self-hosted application**.
2. Name `brianwells-admin`, domain `brianwells.org`, path `admin`.
3. Policy: Allow, include **Emails** → your address.
4. Add a second application for path `api` if you want the REST API gated too. Leave it
   open if the public site needs it — the frontend uses the local API, not HTTP, so
   gating `/api` is safe.

Payload's own login remains active behind Access as a second factor.

### 4. Resend

1. Add and verify the `brianwells.org` domain in Resend (DKIM + SPF records go into
   Cloudflare DNS).
2. Create an API key → `RESEND_API_KEY`.
3. Set `CONTACT_FROM_EMAIL` to an address on the verified domain, and
   `CONTACT_TO_EMAIL` to the Purelymail inbox.

Purelymail handles inbound mail; Resend only sends. Keep the MX records pointed at
Purelymail and add only Resend's DKIM/SPF entries.

### 5. Turnstile

Cloudflare dashboard → Turnstile → **Add widget** for `brianwells.org`. Record
`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

## Database

Create a database on the existing Postgres instance:

```sql
CREATE DATABASE brianwells;
CREATE USER brianwells WITH ENCRYPTED PASSWORD '<generated>';
GRANT ALL PRIVILEGES ON DATABASE brianwells TO brianwells;
```

Payload creates and migrates its own tables on first boot.

## Deploying to unraid

1. Create `/mnt/user/appdata/brianwells-org/` and place `docker-compose.yml` and `.env`
   there. Populate `.env` from `.env.example`.
2. Generate the two secrets:
   ```bash
   openssl rand -hex 32   # PAYLOAD_SECRET
   openssl rand -hex 32   # IP_HASH_SALT
   ```
   `IP_HASH_SALT` must never change after launch — rotating it resets rate-limit history.
3. Authenticate to GHCR (the package is private by default):
   ```bash
   echo <GITHUB_PAT_WITH_read:packages> | docker login ghcr.io -u briswells --password-stdin
   ```
4. Pull and start:
   ```bash
   docker compose pull && docker compose up -d
   ```
5. Verify: `curl -fsS http://localhost:3000/api/health` → `{"status":"ok"}`.
6. Visit `https://brianwells.org/admin`, clear Cloudflare Access, and create the admin user.

## Updating

Push to `main`. CI builds and pushes `:latest` and `:<sha>`. On unraid:

```bash
docker compose pull && docker compose up -d
```

## Rolling back

```bash
docker compose down
docker run -d --env-file .env -p 3000:3000 ghcr.io/briswells/brianwells-org:<previous-sha>
```

Or pin the `image:` tag in `docker-compose.yml` to the known-good SHA and re-run
`docker compose up -d`.

## Backups

- **Postgres:** include the `brianwells` database in the existing server backup routine.
- **R2:** versioning is off by default; enable it on the bucket, or periodically
  `rclone sync` it to the array.
````

- [ ] **Step 4: Rewrite the README**

`README.md`:

````markdown
# brianwells.org

Personal portfolio site. Next.js 16 with Payload 3 embedded, Postgres for content,
Cloudflare R2 for media. Runs as a single container on unraid behind a Cloudflare Tunnel.

## Local development

Requires Node >= 20.9 and a reachable Postgres instance.

```bash
npm install
cp .env.example .env     # then fill in DATABASE_URI, PAYLOAD_SECRET, IP_HASH_SALT
npm run seed
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

R2, Resend, and Turnstile are all optional locally — media falls back to local disk,
email delivery is skipped, and the Turnstile widget is not rendered.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run seed` | Populate content (idempotent) |
| `npm run generate:types` | Regenerate `src/payload-types.ts` after schema changes |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Vitest, pure functions, no database |
| `npm run test:int` | Vitest, requires Postgres |
| `npm run test:e2e` | Playwright, boots a dev server |

Run `npm run generate:types` after any collection or global change — the build fails
otherwise.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Design

See [the design spec](docs/superpowers/specs/2026-08-11-personal-website-design.md).
````

- [ ] **Step 5: Run the full suite one last time**

```bash
npm run lint && npm run typecheck && npm run test:unit && npm run test:int && npm run test:e2e
```

Expected: all pass. Do not proceed to commit if anything fails.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: add GitHub Actions pipeline and deployment runbook

Pipeline lints, typechecks, and runs unit, integration, and e2e suites against a
real Postgres service before publishing the image to GHCR."
```

---

## Post-implementation

These require Brian and are deliberately outside the plan:

1. **Create the GitHub repo** under the personal account, add the remote, push `main`.
   Confirm the commit author is `briswells <briswells@gmail.com>` before pushing.
2. **Upload media through `/admin`:** the headshot to `about.portrait`, the resume PDF to
   `site-settings.resumePdf`, and cover images for the four seeded projects. Projects
   render without covers, so nothing is broken until then.
3. **Fill in contact details:** `publicEmail` and `socialLinks` in Site Settings once the
   Purelymail address exists.
4. **Write the About body and per-project writeups** in the CMS.

## Deviations from the spec

- **Next.js is pinned to 16.2.6, not 16.3.x.** The spec named 16.3.x as current. 16.2.6 is
  the version the Payload 3.87.1 blank template pins and is tested against; 16.3.0 is
  within the peer range and can be adopted later as a deliberate, separately-verified
  upgrade.
- **`src/lib/contact-schema.ts` uses an explicit email regex** rather than Zod's built-in
  email validator, so error copy and trim ordering stay stable across Zod minor releases.
- **Open Graph images inline their colors**, the single exception to the no-literal-colors
  constraint. `ImageResponse` renders in an isolated Satori context with no access to CSS
  custom properties, so the dark-theme token values are copied in as literals. This is the
  only place in the codebase where that is permitted.
- **Open Graph images use Next's `opengraph-image.tsx` file convention** rather than the
  spec's sketched `/og/[...]` route. Next generates the route *and* injects the
  `og:image` meta tag automatically, removing a class of wiring bugs. The generated
  images inline their colors because `ImageResponse` renders in an isolated Satori
  context that cannot read CSS custom properties.
