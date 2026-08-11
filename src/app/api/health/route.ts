import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    // Exercises a real query through the configured adapter.
    await payload.count({ collection: 'users' })
    return Response.json({ status: 'ok' }, { status: 200 })
  } catch {
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
