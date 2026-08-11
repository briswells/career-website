import type { CollectionConfig } from 'payload'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

const paths = () => ['/experience']

export const Education: CollectionConfig = {
  slug: 'education',
  labels: { singular: 'Education', plural: 'Education' },
  access: { read: () => true },
  admin: { useAsTitle: 'degree', defaultColumns: ['degree', 'school', 'date'] },
  hooks: {
    afterChange: [revalidateAfterChange(paths)],
    afterDelete: [revalidateAfterDelete(paths)],
  },
  fields: [
    { name: 'school', type: 'text', required: true },
    { name: 'degree', type: 'text', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
