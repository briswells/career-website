import { expect, test } from '@playwright/test'

test('homepage renders an identifiable heading', async ({ page }) => {
  await page.goto('/')
  // Content is asserted by tests/e2e/home.e2e.spec.ts; this is a layout-shell
  // smoke test that a top-level heading renders at all.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('header exposes primary navigation', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav.getByRole('link', { name: 'Projects' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Experience' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'About' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Contact' })).toBeVisible()
})

test('footer renders without empty contact links', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo')
  await expect(footer).toBeVisible()
  // Contact details are unset at launch: no mailto link should exist at all.
  await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0)
  await expect(footer.locator('a[href=""]')).toHaveCount(0)
})

test('skip link is the first focusable element', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
})
