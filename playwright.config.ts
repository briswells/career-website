import { defineConfig, devices } from '@playwright/test'

// The brief's config omits this, but tests/e2e/admin.e2e.spec.ts (pre-existing,
// out of this task's scope) seeds Payload directly in the test-runner process via
// tests/helpers/seedUser.ts, which needs DATABASE_URI/PAYLOAD_SECRET from .env.
// Without this import that process never loads .env and Payload fails with
// "missing secret key". `npm run dev` (the webServer child process) loads .env on
// its own via Next.js, so this only affects the test-runner process itself.
import 'dotenv/config'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
