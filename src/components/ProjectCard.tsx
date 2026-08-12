import Image from 'next/image'
import Link from 'next/link'
import { asMedia } from '@/lib/media'
import type { Project } from '@/payload-types'
import { Tag } from './ui/Tag'
import styles from './project.module.css'

export function ProjectCard({ project }: { project: Project }) {
  const cover = asMedia(project.coverImage)
  const tags = (project.techStack ?? []).filter((t) => Boolean(t.name))

  return (
    <article className={styles.card}>
      {cover?.url ? (
        <Image
          className={styles.thumb}
          src={cover.url}
          alt={cover.alt}
          width={768}
          height={432}
        />
      ) : null}
      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/projects/${project.slug}`}>{project.title}</Link>
        </h3>
        <p className={styles.summary}>{project.summary}</p>
        {tags.length > 0 ? (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <Tag key={tag.id ?? tag.name}>{tag.name}</Tag>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
