import type { Metadata } from 'next'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getProjects } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Projects built and shipped by Brian Wells.',
}

export default async function ProjectsPage() {
  const projects = await getProjects()
  return (
    <Container>
      <Section title="Work" id="work">
        <ProjectGrid projects={projects} />
      </Section>
    </Container>
  )
}
