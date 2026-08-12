import { Tag } from './ui/Tag'
import styles from './skills.module.css'

export type SkillGroup = {
  id?: string | null
  category: string
  items?: { id?: string | null; name: string }[] | null
}

export function SkillGroups({ groups }: { groups: SkillGroup[] }) {
  if (groups.length === 0) return null
  return (
    <div className={styles.groups}>
      {groups.map((group) => (
        <div key={group.id ?? group.category} className={styles.group}>
          <h3>{group.category}</h3>
          <div className={styles.items}>
            {(group.items ?? []).map((item) => (
              <Tag key={item.id ?? item.name}>{item.name}</Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
