import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'
import type { File, RequiredDataFromCollectionSlug } from 'payload'
import sharp from 'sharp'

/**
 * Generates a solid-color PNG in memory at test time (no committed binary
 * fixture). Wider than the largest configured image size (`hero`, 1600px)
 * so every configured size is actually produced by Payload's sharp pipeline.
 */
async function createTestImage(width: number, height: number): Promise<File> {
  const data = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 30, b: 30 },
    },
  })
    .png()
    .toBuffer()

  return {
    data,
    mimetype: 'image/png',
    name: 'media-int-spec-test-image.png',
    size: data.length,
  }
}

describe('media collection', () => {
  it('rejects creating a document without alt text', async () => {
    const payload = await getPayload({ config })
    const file = await createTestImage(50, 50)

    await expect(
      payload.create({
        collection: 'media',
        // Intentionally invalid: omits the required `alt` field to verify
        // Payload rejects it at runtime, not just in the static config shape.
        data: {} as unknown as RequiredDataFromCollectionSlug<'media'>,
        file,
      }),
    ).rejects.toThrow()
  })

  it('generates the four named image sizes on upload', async () => {
    const payload = await getPayload({ config })
    const file = await createTestImage(2000, 2000)

    const doc = await payload.create({
      collection: 'media',
      data: { alt: 'A solid red square used for media collection int tests' },
      file,
    })

    try {
      expect(Object.keys(doc.sizes ?? {}).sort()).toEqual(['card', 'hero', 'og', 'thumbnail'])
      expect(doc.sizes?.thumbnail?.width).toBe(400)
      expect(doc.sizes?.card?.width).toBe(768)
      expect(doc.sizes?.hero?.width).toBe(1600)
      expect(doc.sizes?.og?.width).toBe(1200)
      expect(doc.sizes?.og?.height).toBe(630)
    } finally {
      await payload.delete({ collection: 'media', id: doc.id })
    }
  })
})
