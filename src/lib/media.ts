import type { Media } from '@/payload-types'

/**
 * Narrows a Payload upload relationship — which Payload types as
 * `number | Media | null | undefined` (an unpopulated relation is just the
 * numeric ID) — down to its populated `Media` document, or `null` when the
 * relation is absent or was fetched at insufficient `depth` to populate.
 *
 * No cast is needed: `typeof value === 'object'` already narrows the union
 * to `Media` once the `value &&` check has ruled out `null`/`undefined`
 * (whose `typeof` is `'object'` and `'undefined'` respectively) and the
 * `object` check itself rules out the bare `number` ID case.
 */
export function asMedia(value: number | Media | null | undefined): Media | null {
  return value && typeof value === 'object' ? value : null
}
