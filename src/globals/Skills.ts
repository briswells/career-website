import type { GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/lib/revalidate'

export const Skills: GlobalConfig = {
  slug: 'skills',
  label: 'Skills',
  access: { read: () => true },
  hooks: { afterChange: [revalidateGlobal(['/experience'])] },
  fields: [
    {
      name: 'groups',
      type: 'array',
      labels: { singular: 'Group', plural: 'Groups' },
      fields: [
        { name: 'category', type: 'text', required: true },
        {
          name: 'items',
          type: 'array',
          fields: [{ name: 'name', type: 'text', required: true }],
        },
      ],
    },
  ],
}
