import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: { read: () => true },
  hooks: {
    afterChange: [
      revalidateGlobal(['/', '/projects', '/experience', '/about', '/contact', '/sitemap.xml']),
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, defaultValue: 'Brian Wells' },
    { name: 'tagline', type: 'text' },
    { name: 'heroHeadline', type: 'textarea' },
    {
      name: 'availabilityStatus',
      type: 'text',
      admin: { description: 'Short status shown in the hero. Leave blank to hide it.' },
    },
    {
      name: 'publicEmail',
      type: 'text',
      admin: { description: 'Leave blank to omit the email link entirely.' },
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    { name: 'resumePdf', type: 'upload', relationTo: 'media' },
    {
      name: 'defaultSeo',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
