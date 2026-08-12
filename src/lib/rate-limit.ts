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
