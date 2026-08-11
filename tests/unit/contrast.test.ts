import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/tokens.css', 'utf8')

/** Extracts custom properties from the Nth `:root { ... }` block. */
function tokenBlock(index: number): Record<string, string> {
  const blocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)]
  const body = blocks[index]?.[1]
  if (!body) throw new Error(`No :root block at index ${index}`)
  const out: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim()
  }
  return out
}

function channel(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`Not a 6-digit hex color: ${hex}`)
  const int = parseInt(m[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function luminance(hex: string): number {
  const srgb = channel(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const themes: Array<[string, number]> = [
  ['light', 0],
  ['dark', 1],
]

describe.each(themes)('%s theme contrast', (_name, index) => {
  const t = () => tokenBlock(index)

  it('body text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text-muted'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on surface meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-text-muted'], tok['--color-surface'])).toBeGreaterThanOrEqual(4.5)
  })

  it('accent as link text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-accent'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('button label on accent fill meets AA (4.5:1)', () => {
    const tok = t()
    expect(
      contrast(tok['--color-accent-contrast'], tok['--color-accent']),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('error text on background meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-error'], tok['--color-bg'])).toBeGreaterThanOrEqual(4.5)
  })

  it('error text on surface meets AA (4.5:1)', () => {
    const tok = t()
    expect(contrast(tok['--color-error'], tok['--color-surface'])).toBeGreaterThanOrEqual(4.5)
  })

  it('muted text on accent-soft fill meets AA (4.5:1)', () => {
    const tok = t()
    expect(
      contrast(tok['--color-text-muted'], tok['--color-accent-soft']),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('accent text on accent-soft fill meets AA (4.5:1)', () => {
    const tok = t()
    expect(
      contrast(tok['--color-accent'], tok['--color-accent-soft']),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
