import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/int/**/*.int.spec.ts'],
    testTimeout: 30_000,
    // Int test files share one Postgres database and each triggers Payload's
    // dev-mode schema push on getPayload(). Running files in parallel workers
    // races concurrent DDL against the same DB (e.g. "column already exists").
    // Serialize file execution to remove that contention.
    fileParallelism: false,
  },
})
