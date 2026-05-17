import { defineConfig } from 'vitest/config'

// Unit tests cover the backend logic — the rate-limiter Durable Object
// and the RDAP response trimmer — so the Node environment is correct
// (no DOM needed). Run with `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
})
