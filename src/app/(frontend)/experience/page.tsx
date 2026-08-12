import type { Metadata } from 'next'
import { EducationList } from '@/components/EducationList'
import { ExperienceTimeline } from '@/components/ExperienceTimeline'
import { SkillGroups } from '@/components/SkillGroups'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Section } from '@/components/ui/Section'
import { getEducation, getExperience, getSiteSettings, getSkills } from '@/lib/queries'
import type { Media } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Career history, education, and technical skills.',
}

export default async function ExperiencePage() {
  const [experience, education, skills, settings] = await Promise.all([
    getExperience(),
    getEducation(),
    getSkills(),
    getSiteSettings(),
  ])

  const resume =
    settings.resumePdf && typeof settings.resumePdf === 'object'
      ? (settings.resumePdf as Media)
      : null

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
