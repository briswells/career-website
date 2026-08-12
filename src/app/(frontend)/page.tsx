import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { Hero } from '@/components/Hero'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getAbout, getExperience, getProjects, getSiteSettings } from '@/lib/queries'
import type { Media } from '@/payload-types'

export default async function HomePage() {
  const [settings, about, featured, experience] = await Promise.all([
    getSiteSettings(),
    getAbout(),
    getProjects({ featured: true, limit: 3 }),
    getExperience(),
  ])

  const portrait =
    about.portrait && typeof about.portrait === 'object' ? (about.portrait as Media) : null
  const resume =
    settings.resumePdf && typeof settings.resumePdf === 'object'
      ? (settings.resumePdf as Media)
      : null

  return (
    <Container>
      <Hero
        headline={settings.heroHeadline || settings.name}
        tagline={settings.tagline}
        status={settings.availabilityStatus}
        portrait={portrait}
        resumeUrl={resume?.url}
      />
      <Section title="Selected work" id="work">
        <ProjectGrid projects={featured} />
      </Section>
      <Section title="Experience" id="experience">
        <ExperienceTimeline items={experience} />
      </Section>
    </Container>
  )
}
