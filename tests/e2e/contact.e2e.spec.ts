import { expect, test } from '@playwright/test'

test('contact page renders the form', async ({ page }) => {
  await page.goto('/contact')
  await expect(page.getByLabel('Name')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Message')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
})

test('server rejects an invalid submission with field errors', async ({ page }) => {
  await page.goto('/contact')
  // Bypass native browser validation so the request reaches the server action.
  await page.locator('form').evaluate((form) => form.setAttribute('novalidate', 'novalidate'))
  await page.getByLabel('Name').fill('')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Message').fill('short')
  await page.getByRole('button', { name: 'Send message' }).click()

  await expect(page.getByText('Name is required')).toBeVisible()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
  await expect(page.getByText('Message must be at least 10 characters')).toBeVisible()
})
