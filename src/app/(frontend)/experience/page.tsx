import type { Metadata } from 'next'
import { EducationList } from '@/components/EducationList'
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { SkillGroups } from '@/components/SkillGroups'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { asMedia } from '@/lib/media'
import { getEducation, getExperience, getSiteSettings, getSkills } from '@/lib/queries'

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Career history, education, and technical skills.',
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

export default async function ExperiencePage() {
  const [experience, education, skills, settings] = await Promise.all([
    getExperience(),
    getEducation(),
    getSkills(),
    getSiteSettings(),
  ])

  const resume = asMedia(settings.resumePdf)

  return (
    <Container>
      <Section title="Experience" id="experience">
        <ExperienceTimeline items={experience} detailed />
      </Section>

      <Section title="Education" id="education">
        <EducationList items={education} />
      </Section>

      <Section title="Skills" id="skills">
        <SkillGroups groups={skills.groups ?? []} />
      </Section>

      {resume?.url ? (
        <Section>
          <Button href={resume.url}>Download resume</Button>
        </Section>
      ) : null}
    </Container>
  )
}
