import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const About: GlobalConfig = {
  slug: 'about',
  label: 'About',
  access: { read: () => true },
  hooks: { afterChange: [revalidateGlobal(['/', '/about'])] },
  fields: [
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'body', type: 'richText' },
  ],
}
