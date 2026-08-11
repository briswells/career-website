export type MaybeLink = { platform?: string | null; url?: string | null }
export type PresentLink = { platform: string; url: string }

export function presentLinks(links: MaybeLink[] | null | undefined): PresentLink[] {
  if (!links) return []
  const out: PresentLink[] = []
  for (const link of links) {
    const platform = link.platform?.trim()
    const url = link.url?.trim()
    if (platform && url) out.push({ platform, url })
  }
  return out
}
