import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  // This suite seeds/cleans up a single shared user in beforeAll/afterAll, so its
  // tests must stay on one worker: with the new fullyParallel:true config,
  // Playwright would otherwise schedule them onto separate workers, running
  // beforeAll multiple times concurrently against the same DB row.
  test.describe.configure({ mode: 'serial' })

  let page: Page

  test.beforeAll(async ({ browser }, _testInfo) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  // KNOWN FLAKE: this test has failed intermittently — observed four separate times
  // across this project's build, on different days and unrelated code changes — always
  // passing on an immediate re-run with no code changes in between. It is not reproducible
  // on demand. Suspected cause: this is a direct `page.goto` to the list view (not a
  // client-side navigation from an already-warm admin session), so it depends on the RSC
  // response and the list view's data fetch completing inside Playwright's default assertion
  // timeout; under CI resource contention (a freshly-booted dev server, single worker,
  // shared runner CPU) that occasionally runs long enough to miss the window. This is
  // Payload's own blank-template test, not code introduced by this project, so root-causing
  // it further would mean debugging Payload admin internals rather than this codebase.
  // Mitigation: `playwright.config.ts` sets `retries: 2` under CI specifically to absorb
  // this. That retry is a deliberate, known accommodation for this test — not a general
  // license to ignore new failures elsewhere.
  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/users')
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto('http://localhost:3000/admin/collections/users/create')
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })
})
