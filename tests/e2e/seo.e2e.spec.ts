import { expect, test } from '@playwright/test'

test('sitemap lists the static pages and every project', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('/projects')
  expect(xml).toContain('/experience')
  expect(xml).toContain('/projects/portside-pottery')
})

test('robots.txt disallows the admin panel', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const text = await response.text()
  expect(text).toContain('Disallow: /admin')
})

test('pages carry a templated title and description', async ({ page }) => {
  await page.goto('/projects')
  await expect(page).toHaveTitle('Work · Brian Wells')
  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute('content', /Projects built and shipped/)
})

test('each project exposes a generated Open Graph image', async ({ page, request }) => {
  await page.goto('/projects/portside-pottery')
  const ogImage = page.locator('meta[property="og:image"]')
  const url = await ogImage.getAttribute('content')
  expect(url).toBeTruthy()

  const response = await request.get(url as string)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
})
