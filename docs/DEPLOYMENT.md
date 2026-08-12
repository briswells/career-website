# Deploying brianwells.org

## One-time Cloudflare setup

### 1. R2 bucket

1. Cloudflare dashboard → R2 → **Create bucket**, name it `brianwells-media`.
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

Payload's own login remains active behind Access as a second factor: Access checks your
identity before the request ever reaches the app, then Payload's login screen still asks
for the admin user's email and password.

### 4. Resend

1. Add and verify the `brianwells.org` domain in Resend (DKIM + SPF records go into
   Cloudflare DNS).
2. Create an API key → `RESEND_API_KEY`.
3. Set `CONTACT_FROM_EMAIL` to an address on the verified domain, and
   `CONTACT_TO_EMAIL` to the Purelymail inbox.

Purelymail handles inbound mail; Resend only sends. Keep the MX records pointed at
Purelymail and add only Resend's DKIM/SPF entries — do not repoint MX, or inbound mail to
the Purelymail inbox stops working.

### 5. Turnstile

Cloudflare dashboard → Turnstile → **Add widget** for `brianwells.org`. Record
`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

## Database

Create a database on the **existing** Postgres server instance — this does not need a
new container:

```sql
CREATE DATABASE brianwells;
CREATE USER brianwells WITH ENCRYPTED PASSWORD '<generated>';
GRANT ALL PRIVILEGES ON DATABASE brianwells TO brianwells;
```

Payload creates and migrates its own tables on first boot.

**Reaching this database from the container.** `docker-compose.yml` sets no
`network_mode`, no `extra_hosts`, and joins no external network, so the app
container gets Docker's default bridge networking — it is *not* on the host's
network namespace. If `DATABASE_URI` says `localhost` or `127.0.0.1`, the
container resolves that to itself, not to unraid's host Postgres, and the only
symptom is `/api/health` returning 503 with no more specific error.

Use one of:

- The unraid box's LAN IP (works as long as Postgres listens on that interface,
  not just `localhost`), e.g.:
  ```
  DATABASE_URI=postgres://brianwells:<password>@192.168.1.50:5432/brianwells
  ```
- The Docker bridge gateway from inside the container (`ip route | awk '/default/ {print $3}'`
  run inside the container, typically `172.17.0.1`), if Postgres is bound to
  `0.0.0.0` or that bridge interface.
- Attaching the `web` service in `docker-compose.yml` to the same Docker network as
  the Postgres container (`networks:` on both services) and using Postgres's
  container name as the host, e.g. `DATABASE_URI=postgres://brianwells:<password>@postgres:5432/brianwells`.

Whichever you pick, confirm Postgres's `listen_addresses` and `pg_hba.conf` actually
accept connections from that address before troubleshooting further.

## Environment variables

Populate all of these in `.env` before starting the container. `.env.example` in the repo
carries empty placeholders for every one of them; there are no others read anywhere in
`src/` or `scripts/`.

| Variable | Purpose |
|---|---|
| `DATABASE_URI` | Postgres connection string |
| `PAYLOAD_SECRET` | Payload's signing secret |
| `NEXT_PUBLIC_SERVER_URL` | Public origin, used for metadata, sitemap, and robots.txt |
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
5. **Seed the database once, before the first visit.** On first boot Postgres is
   empty. The image ships no seed capability — `scripts/seed.ts` runs via `tsx`, a
   devDependency that is never installed in the `runner` stage, and it is not part
   of the `.next/standalone` output that `next build` traces, so the script simply
   does not exist inside the running container. There is no `docker compose exec`
   equivalent for this step. Instead, run it from a local checkout, pointed at the
   production database over the network path documented above:
   ```bash
   DATABASE_URI=postgres://brianwells:<password>@192.168.1.50:5432/brianwells \
   PAYLOAD_SECRET=<same secret as .env> \
     npm run seed
   ```
   The script is idempotent (upserts by slug/company+role/degree), so re-running it
   later is safe. Skipping this step means `/admin` shows nothing while public pages
   still render whatever content was baked into the image at build time from CI's
   throwaway database — and the first real CMS edit will abruptly make a page render
   empty.
6. Verify: `curl -fsS http://localhost:3000/api/health` → `{"status":"ok"}`.
7. Visit `https://brianwells.org/admin`, clear Cloudflare Access, and create the admin user.

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
