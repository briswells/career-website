import type { Project } from '@/payload-types'
import { ProjectCard } from './ProjectCard'
import styles from './project.module.css'

export function ProjectGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return <p>No projects published yet.</p>
  }
  return (
    <div className={styles.grid}>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
