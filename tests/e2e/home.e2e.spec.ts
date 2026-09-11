import { expect, test } from '@playwright/test'

test('hero shows the headline', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'I build and run the systems software depends on.',
  )
})

test('featured projects appear with links to detail pages', async ({ page }) => {
  await page.goto('/')
  const featured = page.getByRole('region', { name: 'Featured work' })
  await expect(featured.getByRole('link', { name: 'Portside Pottery' })).toHaveAttribute(
    'href',
    '/projects/portside-pottery',
  )
  await expect(featured.getByRole('article')).toHaveCount(3)
})

test('condensed timeline lists the current role', async ({ page }) => {
  await page.goto('/')
  const timeline = page.getByRole('region', { name: 'Experience' })
  await expect(timeline).toContainText('PRE Security')
  await expect(timeline).toContainText('Present')
})
