# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# A dummy secret satisfies buildConfig at build time; the real one is injected at runtime.
ENV PAYLOAD_SECRET=build-time-placeholder
# /projects/[slug] uses generateStaticParams, which queries Postgres directly during
# `next build` to pre-render every project slug. Unlike PAYLOAD_SECRET, this can't be a
# dummy value — it must reach a real database. Supplied via a BuildKit secret mount
# rather than ARG/ENV so the connection string never lands in an image layer (an ARG/ENV
# value is baked into the layer history and would be recoverable from an exported build
# cache, e.g. `cache-to: type=gha`, even though it never reaches the final image). The
# database this points at must always be a throwaway one — e.g. a CI service container —
# never production. Production credentials must never be passed to this build.
RUN --mount=type=secret,id=database_uri,env=DATABASE_URI \
    npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

RUN mkdir .next && chown nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
