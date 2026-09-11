import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { Hero } from '@/components/Hero'
import { ProjectGrid } from '@/components/ProjectGrid'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { asMedia } from '@/lib/media'
import { getAbout, getExperience, getProjects, getSiteSettings } from '@/lib/queries'
import styles from '@/components/layout.module.css'

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

export default async function HomePage() {
  const [settings, about, featured, experience] = await Promise.all([
    getSiteSettings(),
    getAbout(),
    getProjects({ featured: true, limit: 3 }),
    getExperience(),
  ])

  const portrait = asMedia(about.portrait)
  const resume = asMedia(settings.resumePdf)

  return (
    <Container>
      <Hero
        headline={settings.heroHeadline || settings.name}
        tagline={settings.tagline}
        status={settings.availabilityStatus}
        portrait={portrait}
        resumeUrl={resume?.url}
      />
      <Section title="Featured work" id="work">
        <ProjectGrid projects={featured} />
      </Section>
      <Section title="Experience" id="experience">
        <ExperienceTimeline items={experience} />
      </Section>
      <Section title="Get in touch" id="contact-cta">
        <div className={styles.ctaRow}>
          <p>Have a role or project in mind? Get in touch.</p>
          <Button href="/contact">Contact me</Button>
        </div>
      </Section>
    </Container>
  )
}
