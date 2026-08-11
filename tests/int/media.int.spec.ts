import { describe, expect, it } from 'vitest'
import config from '@payload-config'
import { getPayload } from 'payload'

describe('media collection', () => {
  it('requires alt text', async () => {
    const payload = await getPayload({ config })
    const field = payload.collections.media.config.fields.find(
      (f) => 'name' in f && f.name === 'alt',
    )
    expect(field).toBeDefined()
    expect(field && 'required' in field && field.required).toBe(true)
  })

  it('defines the four named image sizes', async () => {
    const payload = await getPayload({ config })
    const sizes = payload.collections.media.config.upload
    const names = (typeof sizes === 'object' && sizes.imageSizes ? sizes.imageSizes : []).map(
      (s) => s.name,
    )
    expect(names).toEqual(['thumbnail', 'card', 'hero', 'og'])
  })
})
