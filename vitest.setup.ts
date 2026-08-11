// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Custom DOM matchers (toHaveAttribute, etc.) for component tests
import '@testing-library/jest-dom/vitest'

// @testing-library/react's built-in auto-cleanup only wires itself up when it
// finds a global `afterEach` (e.g. Jest, or Vitest with `globals: true`). This
// project keeps `globals` off, so unmount rendered components between tests
// explicitly instead. `cleanup()` is a no-op when nothing was rendered, so
// this is harmless for the non-DOM (int) test project too.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
