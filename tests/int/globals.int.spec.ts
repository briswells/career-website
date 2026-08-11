import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { About } from '@/payload-types'
import { presentLinks } from '@/lib/links'

// See tests/int/collections.int.spec.ts for why this is needed: afterChange
// hooks call revalidatePath, which requires an active Next.js request
// context that the local API does not provide in these tests.
const disableRevalidate = { disableRevalidate: true }

type LexicalTextNode = { type: 'text'; text: string }
type LexicalParagraphNode = { type: 'paragraph'; children: LexicalTextNode[] }

const testBody: NonNullable<About['body']> = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: 'About paragraph for int test',
            version: 1,
          },
        ],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        textStyle: '',
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
}

describe('site-settings global', () => {
  it('filters a half-filled socialLinks row through presentLinks after a real round-trip', async () => {
    const payload = await getPayload({ config })

    // `url` is `required: true` on this field, so Payload's own validation
    // rejects a literal empty string before it ever reaches the database
    // (confirmed separately: `updateGlobal` throws `ValidationError: The
    // following field is invalid: Social Links 2 > Url` for `url: ''`).
    // The realistic "half-filled" row that *can* be persisted is
    // whitespace-only text, which satisfies Payload's required check but
    // is still functionally blank — exactly the case presentLinks exists
    // to catch.
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        socialLinks: [
          { platform: 'GitHub', url: 'https://github.com/briswells' },
          { platform: 'LinkedIn', url: '   ' },
        ],
      },
      context: disableRevalidate,
    })

    try {
      const found = await payload.findGlobal({ slug: 'site-settings', depth: 0 })

      // Document what Payload's local API actually returns for a
      // persisted whitespace-only field: the whitespace string itself,
      // untouched, not null and not an absent key.
      const blankRow = found.socialLinks?.find((link) => link.platform === 'LinkedIn')
      expect(blankRow?.url).toBe('   ')

      expect(presentLinks(found.socialLinks)).toEqual([
        { platform: 'GitHub', url: 'https://github.com/briswells' },
      ])
    } finally {
      await payload.updateGlobal({
        slug: 'site-settings',
        data: { socialLinks: [] },
        context: disableRevalidate,
      })
    }
  })
})

describe('about global', () => {
  it('round-trips body through the local API', async () => {
    const payload = await getPayload({ config })

    await payload.updateGlobal({
      slug: 'about',
      data: { body: testBody },
      context: disableRevalidate,
    })

    try {
      const found = await payload.findGlobal({ slug: 'about', depth: 0 })
      const paragraph = found.body?.root.children[0] as unknown as LexicalParagraphNode

      expect(paragraph.type).toBe('paragraph')
      expect(paragraph.children[0].text).toBe('About paragraph for int test')
    } finally {
      await payload.updateGlobal({
        slug: 'about',
        data: { body: null },
        context: disableRevalidate,
      })
    }
  })
})

describe('skills global', () => {
  it('preserves group and item order through the local API', async () => {
    const payload = await getPayload({ config })

    await payload.updateGlobal({
      slug: 'skills',
      data: {
        groups: [
          { category: 'Languages', items: [{ name: 'TypeScript' }, { name: 'Go' }] },
          { category: 'Infrastructure', items: [{ name: 'Postgres' }, { name: 'Docker' }] },
        ],
      },
      context: disableRevalidate,
    })

    try {
      const found = await payload.findGlobal({ slug: 'skills', depth: 0 })

      expect(found.groups?.map((group) => group.category)).toEqual([
        'Languages',
        'Infrastructure',
      ])
      expect(found.groups?.[0]?.items?.map((item) => item.name)).toEqual(['TypeScript', 'Go'])
      expect(found.groups?.[1]?.items?.map((item) => item.name)).toEqual(['Postgres', 'Docker'])
    } finally {
      await payload.updateGlobal({
        slug: 'skills',
        data: { groups: [] },
        context: disableRevalidate,
      })
    }
  })
})
