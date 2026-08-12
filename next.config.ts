import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// Every media URL served to the browser is built from R2_PUBLIC_URL
// (src/payload.config.ts's generateFileURL), so next/image's allow-list must
// track that same hostname or every image 400s. Falling back to the literal
// keeps local dev (where R2_PUBLIC_URL is normally unset) working against the
// production custom domain's images. A malformed value must not crash config
// load — `next.config.ts` runs at process start, so a bad env var here would
// take down the whole app rather than just image loading.
function mediaRemotePattern(): { protocol: 'http' | 'https'; hostname: string } {
  const fallback = { protocol: 'https' as const, hostname: 'media.brianwells.org' }
  const raw = process.env.R2_PUBLIC_URL
  if (!raw) return fallback
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback
    return { protocol: url.protocol.slice(0, -1) as 'http' | 'https', hostname: url.hostname }
  } catch {
    return fallback
  }
}

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
    remotePatterns: [mediaRemotePattern()],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
