import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import type { PayloadRequest, RequestContext } from 'payload'
import {
  revalidateAfterChange,
  revalidateAfterDelete,
  revalidateGlobal,
} from '@/lib/revalidate'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockRevalidatePath = vi.mocked(revalidatePath)

type Doc = { id: number; slug?: string | null }

const projectPaths = (doc: Doc): string[] => [
  '/projects',
  ...(doc.slug ? [`/projects/${doc.slug}`] : []),
]

function makeReq(context: RequestContext): PayloadRequest {
  return { context } as unknown as PayloadRequest
}

beforeEach(() => {
  mockRevalidatePath.mockClear()
})

describe('revalidateAfterChange', () => {
  const hook = revalidateAfterChange<Doc>(projectPaths)
  type HookArgs = Parameters<typeof hook>[0]

  it('does not call revalidatePath when context.disableRevalidate is set', () => {
    hook({
      doc: { id: 1, slug: 'a' },
      previousDoc: { id: 1, slug: 'a' },
      req: makeReq({ disableRevalidate: true }),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('calls revalidatePath once per computed path when the flag is unset', () => {
    hook({
      doc: { id: 1, slug: 'a' },
      previousDoc: { id: 1, slug: 'a' },
      req: makeReq({}),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/a')
  })

  it('revalidates both the old and new slug path on a slug change, deduping the shared path', () => {
    hook({
      doc: { id: 1, slug: 'new-slug' },
      previousDoc: { id: 1, slug: 'old-slug' },
      req: makeReq({}),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/new-slug')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/old-slug')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(3)
    const projectsCalls = mockRevalidatePath.mock.calls.filter(([path]) => path === '/projects')
    expect(projectsCalls).toHaveLength(1)
  })
})

describe('revalidateAfterDelete', () => {
  const hook = revalidateAfterDelete<Doc>(projectPaths)
  type HookArgs = Parameters<typeof hook>[0]

  it('does not call revalidatePath when context.disableRevalidate is set', () => {
    hook({
      doc: { id: 1, slug: 'a' },
      req: makeReq({ disableRevalidate: true }),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('calls revalidatePath once per computed path when the flag is unset', () => {
    hook({
      doc: { id: 1, slug: 'a' },
      req: makeReq({}),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/projects/a')
  })
})

describe('revalidateGlobal', () => {
  const paths = ['/', '/about']
  const hook = revalidateGlobal(paths)
  type HookArgs = Parameters<typeof hook>[0]

  it('does not call revalidatePath when context.disableRevalidate is set', () => {
    hook({
      doc: {},
      req: makeReq({ disableRevalidate: true }),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates every path in its array when the flag is unset', () => {
    hook({
      doc: {},
      req: makeReq({}),
    } as unknown as HookArgs)

    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/about')
  })
})
