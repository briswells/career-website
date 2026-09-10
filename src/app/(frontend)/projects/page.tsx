import type { Metadata } from 'next'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getProjects } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Work',
  description: 'Projects built and shipped by Brian Wells.',
}

// Without an explicit `dynamic` export, Next prerenders this page once at
// `next build` time and ships that static HTML in the image. Any CMS edit
// made after that point is invisible on the live site until the next
// deploy rebuilds it from scratch — and a redeploy for something unrelated
// (a code fix, a dependency bump) silently REVERTS every edit made in
// between back to whatever the build-time database happened to contain.
// `force-dynamic` renders this page fresh on every request instead, so
// content always reflects the live database and a deploy can never undo
// an admin edit.
export const dynamic = 'force-dynamic'

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
