import type { CollectionConfig, TypeWithID } from 'payload'
import { slugify } from '@/lib/slug'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

type ProjectDoc = TypeWithID & { slug?: string | null }

const projectPaths = (doc: ProjectDoc): string[] => [
  '/',
  '/projects',
  ...(doc.slug ? [`/projects/${doc.slug}`] : []),
]

export const Projects: CollectionConfig = {
  slug: 'projects',
  access: { read: () => true },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'featured', 'order', 'updatedAt'],
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [revalidateAfterChange<ProjectDoc>(projectPaths)],
    afterDelete: [revalidateAfterDelete<ProjectDoc>(projectPaths)],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Auto-generated from the title when left blank.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === 'string' && value.trim()) return slugify(value)
            if (data?.title) return slugify(String(data.title))
            return value
          },
        ],
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      required: true,
      maxLength: 220,
      admin: { description: 'One or two sentences. Used on cards and as the meta description.' },
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'gallery', type: 'upload', relationTo: 'media', hasMany: true },
    { name: 'role', type: 'text', admin: { description: 'What you personally did.' } },
    { name: 'timeframe', type: 'text', admin: { description: 'e.g. 2024–2025' } },
    {
      name: 'techStack',
      type: 'array',
      fields: [{ name: 'name', type: 'text', required: true }],
    },
    { name: 'repoUrl', type: 'text' },
    { name: 'liveUrl', type: 'text' },
    { name: 'body', type: 'richText' },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Featured projects appear on the homepage.' },
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
