import 'dotenv/config'
import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

const PROJECTS = [
  {
    slug: 'portside-pottery',
    title: 'Portside Pottery',
    summary:
      'Production website and booking platform for a pottery studio, handling payments through Square with an admin backed by Payload.',
    role: 'Sole engineer — design, build, deploy, and ongoing maintenance.',
    timeframe: '2025',
    techStack: ['Next.js', 'Payload', 'Postgres', 'Square'],
    liveUrl: 'https://portsidepottery.com',
    featured: true,
    order: 0,
  },
  {
    slug: 'swift-audiobook-player',
    title: 'Swift Audiobook Player',
    summary:
      'Native iOS client for a self-hosted audiobook platform, covering library browsing, playback, and progress sync.',
    role: 'Frontend iOS development.',
    timeframe: '2024',
    techStack: ['Swift', 'SwiftUI', 'iOS'],
    featured: true,
    order: 1,
  },
  {
    slug: 'ai-model-deployment-pipeline',
    title: 'AI Model Deployment Pipeline',
    summary:
      'CI/CD pipeline automating AI model training and deployment, removing the manual handoff between training runs and serving.',
    role: 'Pipeline design and implementation.',
    timeframe: '2024',
    techStack: ['GitLab CI', 'Python', 'Docker'],
    featured: true,
    order: 2,
  },
  {
    slug: 'distributed-computing-cluster',
    title: 'Distributed Computing Cluster',
    summary:
      'Scalable computing resources including distributed databases and compute clusters, built across the Hadoop and Spark ecosystem.',
    role: 'Cluster architecture and administration.',
    timeframe: '2023–2024',
    techStack: ['Hadoop', 'HDFS', 'Apache Spark', 'Lustre'],
    featured: false,
    order: 3,
  },
]

const EXPERIENCE = [
  {
    company: 'PRE Security',
    role: 'Full Stack Founding Engineer (Early Team)',
    location: 'Remote',
    startDate: '2025-08-01T00:00:00.000Z',
    current: true,
    order: 0,
    bullets: [
      'Architected a Kubernetes-based platform for dynamic data ingress and egress across tenant systems.',
      'Created Go microservices for multi-tenant alerting, RBAC enforcement, and object storage.',
      'Developed an agentic AI chatbot using Agno and the OpenAI SDK, integrating 100+ tools across distributed MCP servers.',
      'Improved prompt engineering for AI-native tools, raising the consistency, reliability, and actionability of outputs.',
      'Built self-service Elasticsearch clustering for monitoring, provisioning, and scaling without backend access.',
      'Designed CI/CD pipelines using GitHub Actions and QEMU to produce golden VM images.',
      'Implemented a WebSocket mesh connection system letting tenants and firewall-protected resources exchange data.',
      'Created an AI pipeline for new integrations using templates, structured prompts, and automated testing.',
    ],
  },
  {
    company: 'Sun Ridge Systems Inc.',
    role: 'Interface Developer',
    location: 'Remote',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2025-08-01T00:00:00.000Z',
    current: false,
    order: 1,
    bullets: [
      'Optimized legacy applications with modern practices including polymorphism, shared classes, and data encapsulation.',
      'Worked directly with clients to determine project specifications, resource allocation, and technical requirements.',
      'Designed and deployed complete REST API interfaces for data exchange.',
      'Updated backend services and Delphi frontend applications for seamless interfacing with external systems.',
      'Built real-time communication systems over TCP sockets to facilitate mission-critical data sharing.',
    ],
  },
  {
    company: 'CSU Chico — IT Support Services',
    role: 'IT Consultant',
    location: 'Chico, CA',
    startDate: '2021-06-01T00:00:00.000Z',
    endDate: '2024-01-01T00:00:00.000Z',
    current: false,
    order: 2,
    bullets: [
      'Monitored servers using Splunk and Qualys for security and compliance.',
      'Developed a Python data pipeline moving data from an internal mail service application into Microsoft Power BI.',
      'Created a C# API to automate door control system updates for enhanced security.',
      'Administered MSSQL databases and Windows environments.',
    ],
  },
]

const EDUCATION = [
  {
    school: 'California State University, Chico',
    degree: 'Master of Science in Computer Science',
    date: '2024-12-01T00:00:00.000Z',
    order: 0,
  },
  {
    school: 'California State University, Chico',
    degree: 'Bachelor of Science in Computer Science',
    date: '2021-05-01T00:00:00.000Z',
    order: 1,
  },
]

const SKILL_GROUPS = [
  {
    category: 'Languages',
    items: ['Python', 'Go', 'TypeScript', 'Delphi', 'C#', 'SQL', 'JavaScript', 'PowerShell', 'Bash'],
  },
  {
    category: 'Datastores',
    items: ['Elasticsearch', 'Postgres', 'pgvector', 'Redis', 'MSSQL', 'MinIO', 'Milvus'],
  },
  { category: 'Web Frameworks', items: ['React', 'Next.js', 'Alpine.js', 'Django'] },
  {
    category: 'Infrastructure & Cloud',
    items: ['Kubernetes', 'Docker', 'Google Cloud', 'Amazon Web Services'],
  },
  { category: 'CI/CD', items: ['GitHub Actions', 'GitLab CI'] },
]

/** Skips revalidation: the seed runs outside a Next.js request scope. */
const ctx = { disableRevalidate: true }

export async function seed(payload: Payload): Promise<void> {
  for (const project of PROJECTS) {
    const { techStack, ...rest } = project
    const data = {
      ...rest,
      techStack: techStack.map((name) => ({ name })),
      _status: 'published' as const,
    }
    const existing = await payload.find({
      collection: 'projects',
      where: { slug: { equals: project.slug } },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'projects',
        id: existing.docs[0].id,
        data,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'projects', data, context: ctx })
    }
  }

  for (const item of EXPERIENCE) {
    const { bullets, ...rest } = item
    const data = { ...rest, bullets: bullets.map((text) => ({ text })) }
    const existing = await payload.find({
      collection: 'experience',
      where: { and: [{ company: { equals: item.company } }, { role: { equals: item.role } }] },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'experience',
        id: existing.docs[0].id,
        data,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'experience', data, context: ctx })
    }
  }

  for (const item of EDUCATION) {
    const existing = await payload.find({
      collection: 'education',
      where: { degree: { equals: item.degree } },
      limit: 1,
      pagination: false,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'education',
        id: existing.docs[0].id,
        data: item,
        context: ctx,
      })
    } else {
      await payload.create({ collection: 'education', data: item, context: ctx })
    }
  }

  await payload.updateGlobal({
    slug: 'skills',
    data: {
      groups: SKILL_GROUPS.map((group) => ({
        category: group.category,
        items: group.items.map((name) => ({ name })),
      })),
    },
    context: ctx,
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      name: 'Brian Wells',
      tagline: 'Software & infrastructure engineer',
      heroHeadline: 'I build and run the systems software depends on.',
    },
    context: ctx,
  })
}

// Allow `npm run seed` to execute this file directly.
if (process.argv[1]?.endsWith('seed.ts')) {
  const payload = await getPayload({ config })
  await seed(payload)
  payload.logger.info('Seed complete.')
  process.exit(0)
}
