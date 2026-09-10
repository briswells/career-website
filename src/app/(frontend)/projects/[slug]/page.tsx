import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { RichText } from '@/components/RichText'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Tag } from '@/components/ui/Tag'
import { asMedia } from '@/lib/media'
import { getProjectBySlug } from '@/lib/queries'
import type { Media } from '@/payload-types'
import styles from '@/components/projectDetail.module.css'

type Params = { params: Promise<{ slug: string }> }

// Without an explicit `dynamic` export, Next prerenders every slug returned
// by `generateStaticParams` once at `next build` time and ships that static
// HTML in the image. Any CMS edit made after that point is invisible on the
// live site until the next deploy rebuilds it from scratch — and a redeploy
// for something unrelated silently REVERTS every edit made in between back
// to whatever the build-time database happened to contain. `force-dynamic`
// renders this page fresh on every request instead, so content always
// reflects the live database and a deploy can never undo an admin edit.
// `generateStaticParams` is removed along with it — it existed only to
// enumerate slugs for prerendering, which no longer happens, and dropping
// it means `next build` no longer needs any database access at all.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) return { title: 'Not found' }
  return { title: project.title, description: project.summary }
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params
  const project = await getProjectBySlug(slug)
  if (!project) notFound()

  const cover = asMedia(project.coverImage)
  const gallery = (project.gallery ?? []).filter(
    (item): item is Media => typeof item === 'object' && item !== null,
  )
  const tags = (project.techStack ?? []).filter((t) => Boolean(t.name))

  return (
    <Container>
      <div style={{ paddingTop: 'var(--space-12)' }}>
        <h1>{project.title}</h1>
        <p>{project.summary}</p>
      </div>

      {cover?.url ? (
        <Image
          className={styles.cover}
          src={cover.url}
          alt={cover.alt}
          width={1600}
          height={900}
          priority
        />
      ) : null}

      <div className={styles.layout}>
        <div>
          <RichText data={project.body} />
          {gallery.length > 0 ? (
            <div className={styles.gallery}>
              {gallery.map((image) =>
                image.url ? (
                  <Image
                    key={image.id}
                    src={image.url}
                    alt={image.alt}
                    width={768}
                    height={512}
                  />
                ) : null,
              )}
            </div>
          ) : null}
        </div>

        <aside className={styles.meta}>
          {project.role ? (
            <div>
              <div className={styles.metaLabel}>Role</div>
              {project.role}
            </div>
          ) : null}
          {project.timeframe ? (
            <div>
              <div className={styles.metaLabel}>Timeframe</div>
              {project.timeframe}
            </div>
          ) : null}
          {tags.length > 0 ? (
            <div>
              <div className={styles.metaLabel}>Stack</div>
              <div className={styles.tags}>
                {tags.map((tag) => (
                  <Tag key={tag.id ?? tag.name}>{tag.name}</Tag>
                ))}
              </div>
            </div>
          ) : null}
          {project.liveUrl || project.repoUrl ? (
            <div className={styles.links}>
              {project.liveUrl ? (
                <Button href={project.liveUrl}>Visit site</Button>
              ) : null}
              {project.repoUrl ? (
                <Button href={project.repoUrl} variant="ghost">
                  View source
                </Button>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  )
}
