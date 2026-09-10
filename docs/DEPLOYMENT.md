# Deploying brianwells.org

Hosted on a DigitalOcean droplet (`206.189.255.28`), reached via a dedicated
Cloudflare Tunnel — no ports opened, no TLS certificate to manage. Postgres runs
self-hosted in the same `docker-compose.yml` as the app, on that droplet.
Deploys are fully automated: push to `main`, GitHub Actions builds the image,
publishes it, then pulls and restarts it on the droplet.

## One-time Cloudflare setup

### 1. R2 bucket

1. Cloudflare dashboard → R2 → **Create bucket**, name it `career-website-media`.
2. Bucket → Settings → **Public access** → connect the custom domain `media.brianwells.org`.
   R2 buckets are private by default; the S3 API endpoint uploads but cannot serve.
3. R2 → **Manage API tokens** → create a token with Object Read & Write scoped to the bucket.
4. Record `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and the endpoint
   `https://<accountId>.r2.cloudflarestorage.com`.

The app's S3 client (`src/payload.config.ts`) is configured with `region: 'auto'` and
`forcePathStyle: true` — both are required for R2 compatibility with the AWS S3 SDK.
`R2_PUBLIC_URL` should be the custom domain from step 2
(`https://media.brianwells.org`), not the S3 API endpoint — the endpoint accepts
uploads but does not serve objects publicly.

**`R2_PUBLIC_URL` and `next.config.ts` are coupled.** `next/image`'s remote-pattern
allow-list is derived from `R2_PUBLIC_URL` at process start (falling back to
`media.brianwells.org` only when the variable is unset). If you ever connect a
different custom domain to the bucket, update `R2_PUBLIC_URL` and redeploy — every
`next/image` for a media asset will 400 until the hostnames match.

### 2. Tunnel

The droplet already runs a `cloudflared` instance for an unrelated project (Portside
Pottery). This gets its own, completely separate tunnel and systemd service — the two
never share a config, so nothing here can affect that tunnel's routing.

1. Zero Trust → Networks → Tunnels → **Create a tunnel** (Cloudflared), name it
   `career-website`.
2. Copy the install command's token (the long string after `--token`).
3. On the droplet, install it as its own systemd unit — do not reuse or edit the
   existing `cloudflared.service`:
   ```bash
   cloudflared service install <TOKEN> \
     --name cloudflared-career \
     --config /etc/cloudflared-career/config.yml
   ```
   If `cloudflared service install` refuses a second instance (it's designed for one
   per host), install manually instead — write a unit at
   `/etc/systemd/system/cloudflared-career.service` that runs
   `cloudflared --no-autoupdate tunnel run --token <TOKEN>`, mirroring the existing
   `cloudflared.service` file, then `systemctl daemon-reload && systemctl enable --now cloudflared-career`.
4. Add a public hostname: `brianwells.org` → `HTTP` → `http://127.0.0.1:3000`.
5. Add `www.brianwells.org` the same way if you want the alias.

No port forwarding and no dynamic DNS: the tunnel dials out, so the droplet's public
IP is irrelevant to routing — Postgres and the app stay unreachable from the internet
even though the box itself has a public address.

### 3. Cloudflare Access on the admin panel

1. Zero Trust → Access → Applications → **Add a self-hosted application**.
2. Name `career-website-admin`, domain `brianwells.org`, path `admin`.
3. Policy: Allow, include **Emails** → your address.
4. Add a second application for path `api` if you want the REST API gated too. Leave it
   open if the public site needs it — the frontend uses the local API, not HTTP, so
   gating `/api` is safe.

Payload's own login remains active behind Access as a second factor: Access checks your
identity before the request ever reaches the app, then Payload's login screen still asks
for the admin user's email and password.

### 4. Resend

1. Add and verify the `brianwells.org` domain in Resend (DKIM + SPF records go into
   Cloudflare DNS).
2. Create an API key → `RESEND_API_KEY`.
3. Set `CONTACT_FROM_EMAIL` to an address on the verified domain, and
   `CONTACT_TO_EMAIL` to your Purelymail inbox.

Purelymail handles inbound mail; Resend only sends. Keep the MX records pointed at
Purelymail and add only Resend's DKIM/SPF entries — do not repoint MX, or inbound mail
stops working.

### 5. Turnstile

Cloudflare dashboard → Turnstile → **Add widget** for `brianwells.org`. Record
`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

## Database

Self-hosted in `docker-compose.yml` alongside the app — no external instance, no
managed database service. `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` in
`.env` configure the `postgres` service directly (the official Postgres image reads
those three variable names itself); `DATABASE_URI` must be built from the same three
values by hand, pointed at the **compose service name**, not an IP:

```
DATABASE_URI=postgres://<POSTGRES_USER>:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>
```

These four values are not derived from each other automatically — keep them in sync
when you change one.

**Postgres's port is bound to the droplet's loopback interface only**
(`127.0.0.1:5432:5432` in `docker-compose.yml`), never `0.0.0.0`. The droplet has a
public IP; without this, the database would be reachable by anyone on the internet.
This also means nothing outside the droplet can query it directly — including your own
machine. For the one-off tasks below (initial migration, seeding, future schema
changes), reach it through an SSH tunnel:

```bash
ssh -L 5433:localhost:5432 deploy@206.189.255.28
# leave that running, then in a second terminal:
DATABASE_URI=postgres://<user>:<password>@localhost:5433/<db> npm run <command>
```

## Environment variables

Populate all of these in `.env` before starting the containers. `.env.example` in the
repo carries empty placeholders for every one of them; there are no others read
anywhere in `src/` or `scripts/`.

| Variable | Purpose |
|---|---|
| `DATABASE_URI` | Postgres connection string, pointed at the `postgres` compose service |
| `PAYLOAD_SECRET` | Payload's signing secret |
| `NEXT_PUBLIC_SERVER_URL` | Public origin, used for metadata and page-level SEO tags |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the self-hosted `postgres` service; must match `DATABASE_URI` |
| `R2_BUCKET` | R2 bucket name; media storage falls back to local disk if unset |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_ENDPOINT` | `https://<accountId>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | The custom domain that serves objects publicly, e.g. `https://media.brianwells.org` |
| `RESEND_API_KEY` | Resend API key |
| `CONTACT_TO_EMAIL` | Purelymail inbox that receives contact submissions |
| `CONTACT_FROM_EMAIL` | Sender address on the Resend-verified domain |
| `TURNSTILE_SITE_KEY` | Turnstile widget site key (public) |
| `TURNSTILE_SECRET_KEY` | Turnstile widget secret key |
| `IP_HASH_SALT` | Salt for hashing submitter IPs before rate-limit tracking |

**`IP_HASH_SALT` must never change after launch.** Rotating it changes every future
hash, which silently resets rate-limit history — anyone previously throttled gets a
clean slate, and vice versa for legitimate submitters whose hash suddenly looks new.
Generate it once and keep it fixed for the life of the deployment.

## The droplet

- `206.189.255.28`, Ubuntu 24.04, Docker + Compose already installed.
- App lives at `/opt/career-website/` (`docker-compose.yml` + `.env`), owned by a
  dedicated `deploy` user — a member of the `docker` group, no `sudo`, no root SSH
  access. That's the account both manual operations and the CI pipeline use.
- `root` access still exists for occasional maintenance (OS updates, disk checks) via
  the same key used for Portside Pottery's droplet access — that key is unrelated to
  and not used by the deploy pipeline.

**GHCR authentication (one-time).** The published image is private by default, so the
`deploy` user needs to authenticate once — Docker caches the login in
`~/.docker/config.json` across every future pull:

```bash
ssh deploy@206.189.255.28
echo <GITHUB_PAT_WITH_read:packages> | docker login ghcr.io -u briswells --password-stdin
```

## First deploy

1. Populate `/opt/career-website/.env` on the droplet with every variable above.
   `PAYLOAD_SECRET`, `IP_HASH_SALT`, and the `POSTGRES_*` values can be generated with
   `openssl rand -hex 32` / `openssl rand -hex 24`; the rest come from the Cloudflare
   and Resend steps.
2. Start Postgres first and confirm it's healthy before anything tries to use it:
   ```bash
   cd /opt/career-website
   docker compose up -d postgres
   docker compose ps   # wait for "healthy"
   ```
3. **Apply the initial migration.** `NODE_ENV=production` disables Payload's dev-mode
   schema push (`@payloadcms/db-postgres`'s `connect.js` gates it explicitly on
   `NODE_ENV !== 'production'`), so a fresh production database gets no tables unless a
   migration applies them. The image doesn't carry the migration CLI — `next build`'s
   standalone trace only includes what the running app imports, not the separate
   `payload` bin or `src/migrations/` — so this runs from a full local checkout, through
   the SSH tunnel above:
   ```bash
   ssh -L 5433:localhost:5432 deploy@206.189.255.28   # leave running
   # second terminal, from your checkout:
   DATABASE_URI=postgres://<user>:<password>@localhost:5433/<db> \
   PAYLOAD_SECRET=<same secret as .env> \
     npm run payload -- migrate
   ```
   `payload migrate` is idempotent — safe to re-run; it no-ops once a migration is
   already applied.
4. **Seed the database once, before the first visit**, through the same tunnel:
   ```bash
   DATABASE_URI=postgres://<user>:<password>@localhost:5433/<db> \
   PAYLOAD_SECRET=<same secret as .env> \
     npm run seed
   ```
   The script is idempotent (upserts by slug/company+role/degree), so re-running it
   later is safe. Skipping this step means `/admin` shows nothing while public pages
   still render whatever content was baked into the image at build time from CI's
   throwaway database — and the first real CMS edit will abruptly make a page render
   empty.
5. Bring up the app:
   ```bash
   docker compose up -d
   ```
6. Verify: `curl -fsS http://127.0.0.1:3000/api/health` (from the droplet, or through
   the tunnel above) → `{"status":"ok"}`.
7. Visit `https://brianwells.org/admin`, clear Cloudflare Access, and create the admin
   user.

## Automated deploys (GitHub Actions)

Every push to `main` runs the full pipeline in `.github/workflows/ci.yml`: lint,
typecheck, unit/integration/e2e tests, a real `next build`, then — only if all of that
is green — `publish` builds and pushes the image to GHCR, and `deploy` SSHes into the
droplet, pulls it, and restarts the container. No manual step after the first deploy
above.

**One-time setup**, both on GitHub (`briswells/career-website` → Settings → Secrets
and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `DEPLOY_SSH_KEY` | The private half of a dedicated deploy-only keypair (not your personal key, not root's) |
| `DEPLOY_HOST` | `206.189.255.28` |
| `DEPLOY_USER` | `deploy` |

The matching public key must already be in `/home/deploy/.ssh/authorized_keys` on the
droplet — the `deploy` user and that directory were created as part of setting this up;
generating a fresh keypair and pointing both places at it is the only remaining step if
you ever need to rotate it:

```bash
ssh-keygen -t ed25519 -f ./deploy-key -N "" -C "github-actions-deploy@career-website"
ssh root@206.189.255.28 "cat >> /home/deploy/.ssh/authorized_keys" < ./deploy-key.pub
# paste the contents of ./deploy-key (not .pub) into the DEPLOY_SSH_KEY secret,
# then delete both local files
```

**`docker-compose.yml` itself isn't synced by the automated pipeline.** `deploy`
only runs `docker compose pull && docker compose up -d` on the droplet's *existing*
copy of the file — it doesn't push compose-file changes there. If you ever edit
`docker-compose.yml` (a new service, a changed port binding, etc.), copy it to the
droplet by hand before the next deploy:
```bash
scp docker-compose.yml deploy@206.189.255.28:/opt/career-website/docker-compose.yml
```

**Schema changes.** The `deploy` job intentionally does not run `payload migrate`.
Automatically applying an unreviewed schema migration against production on every push
is a materially bigger risk than restarting a container on an unchanged schema. When a
future change touches a collection or global, generate the migration
(`npm run payload -- migrate:create <name>`), commit it, and apply it once through the
SSH-tunnel pattern in step 3 above — same as the initial one — before or after that
push reaches `main`.

## Rolling back

```bash
ssh deploy@206.189.255.28
cd /opt/career-website
docker compose down
docker run -d --env-file .env --network career-website_default -p 127.0.0.1:3000:3000 \
  ghcr.io/briswells/brianwells-org:<previous-sha>
```

Or edit `docker-compose.yml`'s `image:` tag to the known-good SHA and re-run
`docker compose up -d` — cleaner, since it goes back through the normal compose
lifecycle (healthcheck, restart policy) rather than a one-off `docker run`.

## Backups

- **Postgres:** no managed backup service — it's a named volume (`pgdata`) on the
  droplet. A daily `pg_dump` via cron, piped somewhere off-box (R2 is right there),
  is enough at this scale:
  ```bash
  0 3 * * * docker exec career-website-db pg_dump -U <user> <db> | gzip > /root/backups/career-$(date +\%F).sql.gz
  ```
- **R2:** versioning is off by default; enable it on the bucket, or periodically
  `rclone sync` it somewhere else.
