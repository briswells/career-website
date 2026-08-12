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
