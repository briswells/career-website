# brianwells.org — Personal Site Design

**Date:** 2026-08-11
**Status:** Approved
**Owner:** Brian Wells

## Purpose

A personal website supporting job applications. It showcases projects, career history,
and enough personality to read as a person rather than a resume dump. Self-hosted on an
unraid server, reachable through a Cloudflare Tunnel at `brianwells.org`.

Success means: a recruiter or hiring manager lands on the homepage, understands within
ten seconds what Brian does, and can reach the project detail or resume they want in one
click.

## Non-goals

- No blog at launch. It can be added later as another Payload collection.
- No standalone photography gallery. Project screenshots and a portrait cover launch needs.
- No analytics at launch.
- No multi-author support. Single admin user.

## Stack

| Concern | Choice | Version |
|---|---|---|
| Framework | Next.js, App Router | 16.3.x |
| CMS | Payload, installed into the same Next.js app | 3.87.1 |
| Database | Postgres via `@payloadcms/db-postgres` | existing server instance |
| Media | Cloudflare R2 via `@payloadcms/storage-s3` | — |
| Rich text | `@payloadcms/richtext-lexical` | 3.87.1 |
| Runtime | Node | 24 (alpine in container) |
| Language | TypeScript | strict mode |
| Email | Resend (outbound) → Purelymail (inbox) | — |
| Bot defense | Cloudflare Turnstile | — |
| Unit tests | Vitest | — |
| E2E tests | Playwright | — |

Payload 3.87.1 is the current stable release; v4 exists only as a canary and is not used.
Payload 3.87.1's `@payloadcms/next` peer range is
`>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`, so
Next.js 16.3.x is supported.

### Why Payload in-app

Payload 3 mounts inside the Next.js app rather than running as a separate service. This
yields one codebase, one container, and one deploy. It also generates TypeScript types
from the schema, so a content model change that breaks a page fails at compile time.
Brian has already shipped Payload in production on portsidepottery.com, so the
operational surface is familiar.

## Content model

Payload collections and globals. All content is editable at `/admin`; nothing about the
content requires a code deploy.

### Collections

**`users`** — Payload auth. Single admin account. No public registration.

**`media`** — Upload collection backed by R2.
- `alt` (text, required) — enforced so no image ships without alt text
- Generated sizes: `thumbnail` (400w), `card` (768w), `hero` (1600w), `og` (1200×630)
- `disablePayloadAccessControl: true` and a `generateFileURL` pointing at the public R2
  domain, so images are served directly from Cloudflare's edge rather than proxied
  through the Node process

**`projects`**
- `title` (text, required)
- `slug` (text, required, unique, auto-generated from title)
- `summary` (textarea, required) — one or two sentences for cards and meta description
- `coverImage` (upload → media, required)
- `gallery` (array of upload → media, optional)
- `role` (text) — what Brian personally did
- `timeframe` (text) — e.g. "2024–2025"
- `techStack` (array of text)
- `repoUrl` (text, optional)
- `liveUrl` (text, optional)
- `body` (Lexical rich text) — the full writeup
- `featured` (checkbox) — surfaces on the homepage
- `order` (number) — manual sort
- `status` (draft/published via Payload versions + drafts)

**`experience`**
- `company`, `role`, `location` (text)
- `startDate` (date), `endDate` (date, optional)
- `current` (checkbox) — when true, `endDate` is hidden and the UI renders "Present"
- `bullets` (array of textarea) — achievement lines
- `order` (number)

**`education`**
- `school`, `degree` (text)
- `date` (date)
- `order` (number)

**`contactSubmissions`**
- `name`, `email`, `message`, `submittedAt`
- `ipHash` (text, admin-hidden) — SHA-256 of the client IP plus a server-side salt, used
  only for rate limiting. Hashed rather than stored raw so the table holds no directly
  identifying network data.
- Admin read-only; created only by the contact server action
- Exists so a Resend outage never loses a message

### Globals

**`siteSettings`** — `name`, `tagline`, `heroHeadline`, `availabilityStatus`,
`publicEmail`, `socialLinks` (array of platform + url), `resumePdf` (upload → media),
`defaultSeo` (title, description, og image).

**`about`** — `portrait` (upload → media), `body` (Lexical rich text).

**`skills`** — array of `category` + `items`, mirroring the resume groupings
(Languages, Datastores, Web Frameworks, Infrastructure & Cloud, CI/CD).

Contact fields are intentionally left empty at launch. Every component that renders a
contact detail or social link must conditionally omit it when unset — no empty `mailto:`
links, no placeholder text visible to visitors.

## Routes

| Route | Contents |
|---|---|
| `/` | Hero (headline, portrait, availability, two CTAs), 3 featured projects, condensed career timeline, contact CTA |
| `/projects` | Grid of all published projects |
| `/projects/[slug]` | Cover, metadata sidebar (role, timeframe, stack, links), rich-text body, gallery |
| `/experience` | Full work history, education, grouped skills, resume PDF download |
| `/about` | Portrait and bio |
| `/contact` | Contact form |
| `/admin` | Payload admin (behind Cloudflare Access) |
| `/api/health` | Container healthcheck — returns 200 and verifies DB connectivity |
| `/sitemap.xml`, `/robots.txt` | Generated from published content |
| `/og/[...]` | Dynamic OG image generation |

Public pages are statically rendered where possible. Payload `afterChange` and
`afterDelete` hooks on `projects`, `experience`, `education`, and the globals call
`revalidatePath` for the affected routes, so visitors get static-fast responses and edits
appear immediately without a redeploy.

## Seed content

A seed script populates initial content from Brian's resume so the site is never empty on
first boot, and so the CMS has real records to edit rather than blank forms.

**Experience:** PRE Security (Full Stack Founding Engineer, Aug 2025–Present) · Sun Ridge
Systems (Interface Developer, Jan 2024–Aug 2025) · CSU Chico IT Support Services
(IT Consultant, Jun 2021–Jan 2024).

**Education:** CSU Chico — MS Computer Science (Dec 2024), BS Computer Science (May 2021).

**Projects:** Portside Pottery (flagship — portsidepottery.com, Payload + Square) · Swift
Audiobook Player · AI Model Deployment pipeline (GitLab CI/CD) · Distributed Computing
(Hadoop, HDFS, Spark, Lustre).

**Skills:** the five resume groupings verbatim.

The seed script is idempotent — re-running it must not duplicate records.

## Visual design

Warm minimal with a deep teal accent. Light and dark themes, following the visitor's
system preference, with no manual toggle at launch.

- **Accent:** `#0f766e` in light mode, `#2dd4bf` in dark mode for adequate contrast
- **Neutrals:** warm greys, not blue-greys — near-white `#ffffff`/`#fdfcfb` surfaces in
  light, near-black `#131211`/`#1c1a18` in dark
- **Type:** system sans stack (`-apple-system`, Inter), tight negative letter-spacing on
  headings, generous line-height on body
- **Shape:** 14px radius cards, 999px pill buttons, 1px hairline borders
- **Portrait:** square-cropped headshot in the hero
- All tokens defined once as CSS custom properties. Components reference tokens, never
  literal color values.
- All accent-on-surface pairings must pass WCAG AA in both themes.

## Contact form

Server action, not a route handler. Flow:

1. Client submits name, email, message, and a Turnstile token
2. Zod validates shape and length bounds
3. Turnstile token verified server-side against Cloudflare's siteverify endpoint
4. Rate limit: at most 3 submissions per IP per hour, tracked by counting
   `contactSubmissions` rows — no extra store, and it survives container restarts
5. Submission written to `contactSubmissions`
6. Resend sends a notification to Brian's Purelymail inbox

Step 5 precedes step 6 deliberately: if Resend fails, the message is already durable and
the user still sees success. Resend failures are logged, not surfaced.

## Deployment

### Container

Multi-stage Dockerfile on `node:24-alpine`, following Payload's documented pattern:
`deps` → `builder` → `runner`, with Next's `output: 'standalone'` to keep the final image
small. Runs as a non-root `nextjs` user. `HOSTNAME=0.0.0.0`, port 3000.

### CI/CD

GitHub Actions on push to `main`:

1. Install dependencies (cached)
2. Lint, typecheck, Vitest, Playwright
3. On success: `docker buildx` with layer caching, push to
   `ghcr.io/briswells/brianwells-org:<sha>` and `:latest`

Tagging by commit SHA makes rollback a matter of pinning the previous tag.

### Runtime on unraid

`docker-compose.yml` defines the app service, pulling from GHCR. It connects to the
existing Postgres instance — no new database container. `cloudflared` routes
`brianwells.org` → `app:3000`. A healthcheck hits `/api/health`.

Cloudflare Tunnel makes dynamic DNS unnecessary: the tunnel is an outbound connection
from `cloudflared`, so a changing home IP is irrelevant and no ports are forwarded.

### Security

- **Cloudflare Access** policy on `brianwells.org/admin*` — identity check at
  Cloudflare's edge before the request reaches the server. Payload's own login sits
  behind it as a second factor.
- Secrets live only in environment variables and GitHub Actions secrets, never in the
  repo. `.env.example` documents required names with empty values.
- R2 bucket is private; a custom domain (`media.brianwells.org`) serves objects publicly
  while the S3 API endpoint is used only for uploads.

### Environment variables

```
DATABASE_URI=
PAYLOAD_SECRET=
NEXT_PUBLIC_SERVER_URL=https://brianwells.org

R2_BUCKET=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=https://<accountId>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.brianwells.org

RESEND_API_KEY=
CONTACT_TO_EMAIL=
CONTACT_FROM_EMAIL=

TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

IP_HASH_SALT=
```

## Testing

**Vitest** — contact form Zod schema (accepts valid input, rejects each invalid shape),
rate limiter behavior, slug generation, date formatting, and the conditional-render logic
that hides unset contact fields.

**Playwright** — smoke tests: homepage renders hero and featured projects; `/projects`
lists published projects only; a project detail page renders body and metadata; contact
form shows validation errors on bad input; `/api/health` returns 200.

Both suites gate the CI image build.

## Repository

Local git repository, `main` branch, with `user.name` and `user.email` set **locally** to
`briswells` / `briswells@gmail.com`. This overrides the machine's global identity
(`brian-presecurity` / `brian@presecurity.ai`) so work attribution never leaks into
personal commits. A GitHub remote will be added later.

`.gitignore` covers `.env`, `.next`, `node_modules`, `/media`, test artifacts, and
`.superpowers/`.

## Implementation notes

- In Payload 3.x, storage adapters are configured in the `plugins` array. Payload v4 moves
  them to a top-level `storage` key. Use the v3 form; revisit on upgrade.
- R2 via the S3 adapter requires `region: 'auto'` and `forcePathStyle: true`.
- `@payloadcms/storage-r2` is for Cloudflare Workers only and does not apply here.

## Open items

These are deferred by decision, not oversight:

- Public email, social links, and `CONTACT_TO_EMAIL` are unset at launch. Brian fills them
  in through the CMS and environment once the Purelymail address is chosen.
- GitHub remote is created and pushed later.
