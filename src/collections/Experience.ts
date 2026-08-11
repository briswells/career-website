import type { CollectionConfig } from 'payload'
import { revalidateAfterChange, revalidateAfterDelete } from '@/lib/revalidate'

const paths = () => ['/', '/experience']

export const Experience: CollectionConfig = {
  slug: 'experience',
  labels: { singular: 'Experience', plural: 'Experience' },
  access: { read: () => true },
  admin: {
    useAsTitle: 'company',
    defaultColumns: ['company', 'role', 'startDate', 'current'],
  },
  hooks: {
    afterChange: [revalidateAfterChange(paths)],
    afterDelete: [revalidateAfterDelete(paths)],
  },
  fields: [
    { name: 'company', type: 'text', required: true },
    { name: 'role', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'startDate', type: 'date', required: true },
    {
      name: 'current',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'When checked, the end date is ignored and "Present" is shown.' },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: { condition: (data) => !data?.current },
    },
    {
      name: 'bullets',
      type: 'array',
      labels: { singular: 'Bullet', plural: 'Bullets' },
      fields: [{ name: 'text', type: 'textarea', required: true }],
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { description: 'Lower sorts first.' } },
  ],
}
