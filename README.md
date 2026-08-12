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
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest, pure functions, no database |
| `npm run test:int` | Vitest, requires Postgres |
| `npm run test:e2e` | Playwright, boots a dev server |
| `npm test` | Runs unit, then int, then reseeds, then e2e — the full local suite |

Run `npm run generate:types` after any collection or global change — the build fails
otherwise.

`npm run test:int` resets seeded content as a side effect, which is why `npm test`
reseeds before running `npm run test:e2e` — several e2e specs assert seeded content and
would otherwise fail for a reason unrelated to any real defect.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Design

See [the design spec](docs/superpowers/specs/2026-08-11-personal-website-design.md).
