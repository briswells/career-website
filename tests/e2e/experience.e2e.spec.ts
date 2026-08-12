import { expect, test } from '@playwright/test'

test('experience page shows roles with bullets', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByText('Full Stack Founding Engineer (Early Team)')).toBeVisible()
  await expect(
    page.getByText('Architected a Kubernetes-based platform', { exact: false }),
  ).toBeVisible()
})

test('experience page lists education and skills', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByText('Master of Science in Computer Science')).toBeVisible()
  await expect(page.getByText('Infrastructure & Cloud')).toBeVisible()
  // Scoped to #skills: "Kubernetes" also appears inside an experience bullet
  // ("Architected a Kubernetes-based platform..."), so an unscoped match is
  // ambiguous between that bullet and the skills tag.
  await expect(page.locator('#skills').getByText('Kubernetes', { exact: true })).toBeVisible()
})

test('resume download is absent when no resume is uploaded', async ({ page }) => {
  await page.goto('/experience')
  await expect(page.getByRole('link', { name: 'Download resume' })).toHaveCount(0)
})

test('about page renders', async ({ page }) => {
  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible()
})
