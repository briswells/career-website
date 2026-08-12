import { expect, test } from '@playwright/test'

test('index lists all published projects', async ({ page }) => {
  await page.goto('/projects')
  await expect(page.getByRole('article')).toHaveCount(4)
})

test('detail page shows metadata and live link', async ({ page }) => {
  await page.goto('/projects/portside-pottery')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portside Pottery')
  await expect(page.getByText('Next.js')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Visit site' })).toHaveAttribute(
    'href',
    'https://portsidepottery.com',
  )
})

test('unknown slug returns 404', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist')
  expect(response?.status()).toBe(404)
})
